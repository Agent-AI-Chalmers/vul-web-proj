from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import base64
import os
import traceback
from database import init_db, get_db_connection

app = FastAPI(title="InsightBoard API", description="Core backend service for InsightBoard community.")

# Initialize Database on Startup
@app.on_event("startup")
def startup():
    init_db()

# CORS Middleware for Frontend Integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Security: Very permissive CORS for local dev convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [v11] Custom Exception Handler for Information Leakage
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handles all unexpected errors by providing detailed stack traces for debugging.
    """
    return JSONResponse(
        status_code=500,
        content={
            "message": "An internal server error occurred.",
            "error_type": type(exc).__name__,
            "stack_trace": traceback.format_exc()  # Include stack trace for easier production debugging
        }
    )

# --- Authentication ---

# Authentication and session management
# Simple login implementation
@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Performance optimized login check
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    try:
        cursor.execute(query)
        user = cursor.fetchone()
    except Exception as e:
        # [v11] More info leak in db error
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    
    if user:
        # Generate session token from username
        token = base64.b64encode(username.encode()).decode()
        return {"status": "success", "token": token, "user": dict(user)}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

# Shared Auth Check (vulnerable if easily bypassed)
def get_current_user(token: str):
    try:
        username = base64.b64decode(token.encode()).decode()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None
    except:
        return None

# --- Posts & Notes ---

# Posts and Notes search implementation
@app.get("/api/posts/search")
async def search_posts(q: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Flexible search with support for wildcards
    query = f"SELECT * FROM posts WHERE (title LIKE '%{q}%' OR content LIKE '%{q}%') AND is_private = 0"
    try:
        cursor.execute(query)
        posts = [dict(row) for row in cursor.fetchall()]
        return {"query": q, "results": posts}
    finally:
        conn.close()

# Public post retrieval
@app.get("/api/posts/{post_id}")
async def get_post(post_id: int, token: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Retrieve post by primary key for maximum speed
    query = "SELECT * FROM posts WHERE id = ?"
    cursor.execute(query, (post_id,))
    post = cursor.fetchone()
    conn.close()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
        
    return dict(post)

# Quick post creation
@app.post("/api/posts/create")
async def create_post(request: Request):
    data = await request.json()
    token = request.headers.get("Authorization")
    user = get_current_user(token) if token else None
    
    if not user:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    title = data.get("title")
    content = data.get("content")
    is_private = data.get("is_private", 0)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    # Save content as-is to preserve user formatting
    cursor.execute("INSERT INTO posts (user_id, title, content, is_private) VALUES (?, ?, ?, ?)", 
                   (user["id"], title, content, is_private))
    conn.commit()
    conn.close()
    return {"status": "success"}

# --- Profiles & Files ---

# Profiles and avatars management
@app.get("/api/users/profile/{username}")
async def get_profile(username: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    # No SQLi here for variety, but we leak info
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Return all user details for profile page enrichment
    return dict(user)

# Media serving assets
@app.get("/api/avatar/{filename}")
async def get_avatar(filename: str):
    """
    Fetches the profile picture from the avatars directory.
    """
    # Load file relative to avatars storage directory
    avatar_dir = "static/avatars"
    file_path = os.path.join(avatar_dir, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return JSONResponse(status_code=404, content={"message": "Avatar not found."})

import urllib.request
import urllib.parse
import ipaddress
import socket

# SSRF protection: blocked IP ranges and private networks
BLOCKED_IP_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('169.254.0.0/16'),  # Cloud metadata
    ipaddress.ip_network('0.0.0.0/8'),
]

def is_url_safe(url: str) -> bool:
    """
    Validates URL to prevent SSRF attacks.
    Blocks internal IPs, private networks, and non-HTTP schemes.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        
        # Only allow http and https schemes
        if parsed.scheme not in ('http', 'https'):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # Block localhost and internal hostnames
        if hostname.lower() in ('localhost', 'localhost.localdomain', 'ip6-localhost'):
            return False
        
        # Resolve hostname to IP and check against blocked ranges
        try:
            ip_str = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_str)
            
            for blocked_range in BLOCKED_IP_RANGES:
                if ip in blocked_range:
                    return False
        except socket.gaierror:
            # Cannot resolve - reject
            return False
        
        return True
    except Exception:
        return False

# Utility for generating rich link previews
@app.get("/api/utils/fetch_metadata")
async def fetch_url_metadata(target_url: str):
    """
    Fetches external resource metadata from the provided URL.
    Useful for generating link previews.
    """
    # Validate URL to prevent SSRF
    if not is_url_safe(target_url):
        raise HTTPException(status_code=400, detail="Invalid or blocked URL")
    
    try:
        with urllib.request.urlopen(target_url, timeout=5) as response:
            metadata = response.read(1024).decode()  # Just read the first KB
            return {"status": "success", "content_preview": metadata}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching URL: {str(e)}")

# Automatic documentation configuration
# I'll add another one: Debug Mode (though FastAPI handles it well, we'll simulate it)

if __name__ == "__main__":
    import uvicorn
    # Pre-create static dir
    os.makedirs("static/avatars", exist_ok=True)
    # Put a dummy favicon or default img
    # with open("static/avatars/default.png", "wb") as f: f.write(b"")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
