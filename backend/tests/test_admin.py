import pytest
from backend.tests.conftest import seed_user, seed_hotel_with_room


def _admin_header(client, db):
    seed_user(db, name="Admin", email="admin2@test.com", password="admin123", is_admin=True)
    res = client.post("/auth/login", json={"email": "admin2@test.com", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_admin_create_hotel(client, db):
    headers = _admin_header(client, db)
    res = client.post("/admin/hotels", json={
        "name": "Admin Hotel",
        "city": "Delhi",
        "address": "1 Admin Road, Delhi",
        "description": "A test hotel created via admin API.",
        "star_rating": 4.5,
        "amenities": "WiFi, Pool",
    }, headers=headers)
    assert res.status_code == 201
    assert res.json()["name"] == "Admin Hotel"


def test_admin_update_hotel(client, db):
    headers = _admin_header(client, db)
    hotel, _ = seed_hotel_with_room(db, city="Goa")

    res = client.patch(f"/admin/hotels/{hotel.id}", json={"name": "Updated Name"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Name"


def test_admin_delete_hotel(client, db):
    headers = _admin_header(client, db)
    hotel, _ = seed_hotel_with_room(db, city="Mumbai")

    res = client.delete(f"/admin/hotels/{hotel.id}", headers=headers)
    assert res.status_code == 204

    # Should now 404
    assert client.get(f"/hotels/{hotel.id}").status_code == 404


def test_non_admin_cannot_access_admin_routes(client, db):
    seed_user(db, email="regular@test.com", password="pass123")
    res = client.post("/auth/login", json={"email": "regular@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    r = client.post("/admin/hotels", json={
        "name": "Illegal Hotel",
        "city": "X",
        "address": "X",
        "description": "Should be rejected.",
        "star_rating": 3.0,
    }, headers=headers)
    assert r.status_code == 403


def test_admin_view_all_bookings(client, db):
    headers = _admin_header(client, db)
    res = client.get("/admin/bookings", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
