import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "travel.db"

# Database connection URL - using SQLite single file by default.
# Can be replaced with PostgreSQL or MySQL simply by changing this variable.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

# Security & JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "travel-app-insecure-secret-key-change-in-prod-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Optional Pexels API key for fetching dynamic hotel images
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
