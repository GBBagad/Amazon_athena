import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "athena_history.db")

def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text TEXT NOT NULL,
                execution_time_ms INTEGER,
                data_scanned_bytes INTEGER,
                cost REAL,
                state TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def save_query(query_text, execution_time_ms, data_scanned_bytes, cost, state):
    with get_db_connection() as conn:
        cursor = conn.execute('''
            INSERT INTO queries (query_text, execution_time_ms, data_scanned_bytes, cost, state)
            VALUES (?, ?, ?, ?, ?)
        ''', (query_text, execution_time_ms, data_scanned_bytes, cost, state))
        conn.commit()
        return cursor.lastrowid

def get_recent_queries(limit=50):
    with get_db_connection() as conn:
        cursor = conn.execute('''
            SELECT * FROM queries ORDER BY timestamp DESC LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
