import sqlite3
import os

DATABASE_PATH = "insightboard.db"

def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        bio TEXT,
        avatar_path TEXT DEFAULT 'default.png'
    )
    ''')
    
    # Create Posts Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_private INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Insert a demo user if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, password, email, bio) VALUES (?, ?, ?, ?)", 
                       ("admin", "admin123", "admin@insightboard.local", "I am the administrator."))
        cursor.execute("INSERT INTO users (username, password, email, bio) VALUES (?, ?, ?, ?)", 
                       ("alice", "password123", "alice@example.com", "Loves tea and notes."))
        
        # Add some initial global posts
        cursor.execute("INSERT INTO posts (user_id, title, content, is_private) VALUES (1, 'Welcome!', 'Welcome to InsightBoard - A secure and private community platform.', 0)")
        cursor.execute("INSERT INTO posts (user_id, title, content, is_private) VALUES (2, 'Secret Note', 'This is my private secret note. Only I should see this!', 1)")

    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Database helper for "vulnerable" queries
def execute_raw_query(query: str):
    """
    Executes a raw SQL query. Used for legacy support and flexible data fetching.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        res = cursor.fetchall()
        conn.commit()
        return [dict(row) for row in res]
    except Exception as e:
        # Leak info in debug mode?
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
