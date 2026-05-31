"""
DESIGN PATTERN: Singleton

PROBLEM: Database connections are expensive resources. If every part of the
application created its own connection, we'd exhaust MySQL's connection pool
under load, causing crashes.

SOLUTION: DatabaseManager uses the Singleton pattern to guarantee exactly ONE
instance exists for the entire application lifetime. All code that needs DB
access goes through this single manager.

HOW IT WORKS:
  __new__ is Python's object constructor. It runs before __init__.
  By checking _instance in __new__, we intercept creation and return
  the existing object instead of building a new one.

SCALABILITY: To swap MySQL for PostgreSQL, only this class changes.

SDA NOTE FOR STUDENTS:
  Django's ORM connection pooling already implements this under the hood.
  We make it explicit here so you can see the pattern in real code.
  In a real project you'd also add connection health-check logic here.
"""
import threading
from django.db import connection, connections


class DatabaseManager:
    _instance = None
    _lock = threading.Lock()  # Thread-safe: prevents race conditions during startup

    def __new__(cls):
        # Double-checked locking: fast path (no lock) + safe path (with lock)
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:  # Check again inside the lock
                    cls._instance = super().__new__(cls)
        return cls._instance

    def get_connection(self):
        """Return the default Django DB connection."""
        return connection

    def is_healthy(self) -> bool:
        """Ping the database — useful for health-check endpoints."""
        try:
            connection.ensure_connection()
            return True
        except Exception:
            return False

    def close_old_connections(self):
        """Close stale connections (call in long-running background tasks)."""
        connections.close_all()


# Module-level singleton instance — import this instead of instantiating the class
db_manager = DatabaseManager()
