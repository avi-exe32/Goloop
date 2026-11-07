"""
Pytest configuration: creates an in-memory SQLite database per test session,
seeds the minimum required data, and provides a FastAPI TestClient.

Why an in-memory database?
- Each test run starts with a known, clean state.
- Tests don't touch the development travel.db file.
- In-memory SQLite is fast and has no I/O overhead.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.app.models.hotel import Hotel, HotelImage
from backend.app.models.room import Room
from backend.app.services.auth import hash_password

TEST_DATABASE_URL = "sqlite://"  # In-memory SQLite; discarded when the connection closes

engine_test = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Apply the same PRAGMAs to the test engine for consistency
@event.listens_for(engine_test, "connect")
def set_test_pragmas(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db():
    """Yield a fresh transaction-wrapped session per test; rolls back after."""
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    """TestClient with the real app, database dependency overridden to use test db."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ------ Seed helpers used by multiple tests ------

def seed_user(db, name="Test User", email="test@test.com", password="pass123", is_admin=False):
    user = User(name=name, email=email, hashed_password=hash_password(password), is_admin=is_admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_hotel_with_room(db, city="Goa", price=3000.0, total_rooms=2, capacity=2):
    hotel = Hotel(
        name=f"Test Hotel {city}",
        city=city,
        address="123 Test St",
        description="A clean comfortable hotel for testing.",
        star_rating=4.0,
        amenities="WiFi, Pool",
        price_per_night_min=price,
    )
    db.add(hotel)
    db.flush()

    db.add(HotelImage(hotel_id=hotel.id, image_url="https://picsum.photos/seed/test/800/500", is_primary=True))

    room = Room(
        hotel_id=hotel.id,
        room_type="Standard Double",
        description="Comfortable room with queen bed.",
        price_per_night=price,
        capacity=capacity,
        total_rooms=total_rooms,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return hotel, room
