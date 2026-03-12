import sqlite3
import os

# If DB_PATH exists in environment variables, use it; otherwise default to 'quiz_app.db'
DB_PATH = os.environ.get('DB_PATH', 'quiz_app.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    
    # Set up the connection to return rows as dictionaries not tuples
    conn.row_factory = sqlite3.Row

    # Enable foreign key constraint enforcement in SQLite
    conn.execute("PRAGMA foreign_keys = ON")

    return conn


# Function to initialize the database and create tables if they do not exist
def init_db():

    conn = get_db()
    cursor = conn.cursor()

    # Create the users table
    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                   ''')
    
    # Create the quizzes table
    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS quizzes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        source_type TEXT NOT NULL,
                        source_filename TEXT,
                        questions TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                   '''
                   )
    
    # Create the quiz_results table
    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS quiz_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        quiz_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        answers TEXT NOT NULL,
                        score INTEGER NOT NULL,
                        total INTEGER NOT NULL,
                        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                   '''
                   )
    
    conn.commit()
    conn.close()

    # Print confirmation message in the console
    print("✅ Database initialized!")