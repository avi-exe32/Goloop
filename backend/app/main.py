from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import engine, Base
from backend.app.routers import auth, hotels, bookings, admin

# Create all tables that don't yet exist in the database.
# In production you would use Alembic migrations instead, but for this learning
# project creating tables on startup keeps the setup simple.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Goloop Travel API",
    description="Travel booking backend with SQLite, JWT auth and SSE live events.",
    version="1.0.0",
)

# Allow the Vite dev server (port 5173) and a production build to call the API.
# In production you would narrow origins to your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(hotels.router)
app.include_router(bookings.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
