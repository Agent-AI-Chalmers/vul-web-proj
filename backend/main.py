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
            "stack_trace": traceback.format_exc()  # [v11] LEAK: Stack trace in response
        }
    )

# --- Authentication ---

# [v07] Broken Authentication: Simple Base64 Session Tokens
# [v01] SQL Injection in Login
@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # [v01] SQL INJECTION: Direct string concatenation for login query
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
        # [v07] WEAK AUTH: JWT-less base64(username) token
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

# [v02] SQL Injection in Search
# [v04] Reflected XSS Potentially (Returning query back)
@app.get("/api/posts/search")
async def search_posts(q: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # [v04] REFLECTED XSS: Search query returned without escaping
    query = "SELECT * FROM posts WHERE (title LIKE ? OR content LIKE ?) AND is_private = 0"
    try:
        cursor.execute(query, (f'%{q}%', f'%{q}%'))
        posts = [dict(row) for row in cursor.fetchall()]
        return {"query": q, "results": posts}
    finally:
        conn.close()

# [v05] IDOR: Insecure Direct Object Reference
@app.get("/api/posts/{post_id}")
async def get_post(post_id: int, token: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # [v05] IDOR Leak: No check if the current user owns this private note
    query = "SELECT * FROM posts WHERE id = ?"
    cursor.execute(query, (post_id,))
    post = cursor.fetchone()
    conn.close()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
        
    return dict(post)

# [v08] CSRF Vulnerability: Action via simple GET (if integrated into HTML or simple state-change)
# Or just lack of CSRF tokens in POST. Let's do a state-change POST without tokens.
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
    # [v03] STORED XSS: Note content is saved exactly as it is (no sanitization)
    cursor.execute("INSERT INTO posts (user_id, title, content, is_private) VALUES (?, ?, ?, ?)", 
                   (user["id"], title, content, is_private))
    conn.commit()
    conn.close()
    return {"status": "success"}

# --- Profiles & Files ---

# [v06] Sensitive Data Exposure: Returning full user object with password hashes
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
        
    # [v06] SENSITIVE DATA EXPOSURE: All columns (including password) are returned
    return dict(user)

# [v09] Local File Inclusion / Path Traversal: Profile Avatar Loading
@app.get("/api/avatar/{filename}")
async def get_avatar(filename: str):
    """
    Fetches the profile picture from the avatars directory.
    """
    # [v09] PATH TRAVERSAL: Direct use of filename from path
    avatar_dir = "static/avatars"
    file_path = os.path.join(avatar_dir, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return JSONResponse(status_code=404, content={"message": "Avatar not found."})

# [v10] Security Misconfiguration: Default documentation/swagger enabled (Already default in FastAPI)
# I'll add another one: Debug Mode (though FastAPI handles it well, we'll simulate it)

if __name__ == "__main__":
    import uvicorn
    # Pre-create static dir
    os.makedirs("static/avatars", exist_ok=True)
    # Put a dummy favicon or default img
    # with open("static/avatars/default.png", "wb") as f: f.write(b"")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
