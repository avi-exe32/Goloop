from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import DATABASE_URL

# Connect arguments: check_same_thread=False allows FastAPI threads to share SQLite connection instances safely
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# SQLite-specific performance and concurrency optimizations:
# 1. foreign_keys = ON: SQLite disables foreign keys by default. We enable them so child records
#    (e.g., room images, bookings) maintain relational integrity.
# 2. journal_mode = WAL: Write-Ahead Logging allows simultaneous readers and a writer,
#    greatly reducing database lock contentions under traffic.
# 3. busy_timeout = 5000: When a write transaction occurs, waiting readers/writers wait up to 5s
#    rather than instantly failing with "database is locked".
if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA busy_timeout = 5000;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request.
    Transactions are automatically closed when request finishes to keep transaction duration minimal.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
