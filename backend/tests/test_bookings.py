"""
Booking tests: covers the happy path, validation, and the core double-booking
prevention logic that is the most critical correctness requirement of this app.
"""
from datetime import date, timedelta
from backend.tests.conftest import seed_user, seed_hotel_with_room


TODAY = date.today()
CHECKIN = TODAY + timedelta(days=10)
CHECKOUT = TODAY + timedelta(days=12)


def _auth_header(client, email, password):
    res = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_create_booking_success(client, db):
    seed_user(db, email="book@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db)
    headers = _auth_header(client, "book@test.com", "pass123")

    res = client.post("/bookings", json={
        "hotel_id": hotel.id,
        "room_id": room.id,
        "check_in": CHECKIN.isoformat(),
        "check_out": CHECKOUT.isoformat(),
        "guests": 1,
    }, headers=headers)

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "confirmed"
    # 2 nights * room price
    assert data["total_price"] == room.price_per_night * 2


def test_booking_requires_auth(client, db):
    hotel, room = seed_hotel_with_room(db)
    res = client.post("/bookings", json={
        "hotel_id": hotel.id,
        "room_id": room.id,
        "check_in": CHECKIN.isoformat(),
        "check_out": CHECKOUT.isoformat(),
        "guests": 1,
    })
    assert res.status_code == 401


def test_booking_checkout_before_checkin(client, db):
    seed_user(db, email="bad@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db)
    headers = _auth_header(client, "bad@test.com", "pass123")

    res = client.post("/bookings", json={
        "hotel_id": hotel.id,
        "room_id": room.id,
        "check_in": CHECKOUT.isoformat(),
        "check_out": CHECKIN.isoformat(),
        "guests": 1,
    }, headers=headers)
    assert res.status_code == 400


def test_booking_exceeds_capacity(client, db):
    seed_user(db, email="cap@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db, capacity=1)
    headers = _auth_header(client, "cap@test.com", "pass123")

    res = client.post("/bookings", json={
        "hotel_id": hotel.id,
        "room_id": room.id,
        "check_in": CHECKIN.isoformat(),
        "check_out": CHECKOUT.isoformat(),
        "guests": 3,
    }, headers=headers)
    assert res.status_code == 400


def test_double_booking_prevented(client, db):
    """
    Critical test: when total_rooms=1 and one confirmed booking already occupies
    the same dates, a second booking for overlapping dates must be rejected with 409.
    """
    seed_user(db, email="user1@test.com", password="pass123")
    seed_user(db, email="user2@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db, total_rooms=1)

    headers1 = _auth_header(client, "user1@test.com", "pass123")
    headers2 = _auth_header(client, "user2@test.com", "pass123")

    payload = {
        "hotel_id": hotel.id,
        "room_id": room.id,
        "check_in": CHECKIN.isoformat(),
        "check_out": CHECKOUT.isoformat(),
        "guests": 1,
    }

    # First booking succeeds
    res1 = client.post("/bookings", json=payload, headers=headers1)
    assert res1.status_code == 201

    # Second booking for the exact same dates must fail with 409 Conflict
    res2 = client.post("/bookings", json=payload, headers=headers2)
    assert res2.status_code == 409


def test_non_overlapping_bookings_allowed(client, db):
    """Adjacent (non-overlapping) date ranges must both succeed even on a 1-room property."""
    seed_user(db, email="adj1@test.com", password="pass123")
    seed_user(db, email="adj2@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db, total_rooms=1)

    headers1 = _auth_header(client, "adj1@test.com", "pass123")
    headers2 = _auth_header(client, "adj2@test.com", "pass123")

    # First stay: nights 10-12
    res1 = client.post("/bookings", json={
        "hotel_id": hotel.id, "room_id": room.id,
        "check_in": (TODAY + timedelta(days=10)).isoformat(),
        "check_out": (TODAY + timedelta(days=12)).isoformat(),
        "guests": 1,
    }, headers=headers1)
    assert res1.status_code == 201

    # Second stay starts exactly when the first ends — no overlap
    res2 = client.post("/bookings", json={
        "hotel_id": hotel.id, "room_id": room.id,
        "check_in": (TODAY + timedelta(days=12)).isoformat(),
        "check_out": (TODAY + timedelta(days=14)).isoformat(),
        "guests": 1,
    }, headers=headers2)
    assert res2.status_code == 201


def test_cancel_booking(client, db):
    seed_user(db, email="cancel@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db)
    headers = _auth_header(client, "cancel@test.com", "pass123")

    res = client.post("/bookings", json={
        "hotel_id": hotel.id, "room_id": room.id,
        "check_in": CHECKIN.isoformat(),
        "check_out": CHECKOUT.isoformat(),
        "guests": 1,
    }, headers=headers)
    booking_id = res.json()["id"]

    cancel_res = client.patch(f"/bookings/{booking_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"


def test_cancel_then_rebook(client, db):
    """After a cancellation the room slot must become available again."""
    seed_user(db, email="rebk1@test.com", password="pass123")
    seed_user(db, email="rebk2@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db, total_rooms=1)

    headers1 = _auth_header(client, "rebk1@test.com", "pass123")
    headers2 = _auth_header(client, "rebk2@test.com", "pass123")

    payload = {
        "hotel_id": hotel.id, "room_id": room.id,
        "check_in": CHECKIN.isoformat(), "check_out": CHECKOUT.isoformat(), "guests": 1,
    }

    r1 = client.post("/bookings", json=payload, headers=headers1)
    assert r1.status_code == 201
    booking_id = r1.json()["id"]

    # Confirm second booking is blocked
    r2 = client.post("/bookings", json=payload, headers=headers2)
    assert r2.status_code == 409

    # Cancel the first booking
    client.patch(f"/bookings/{booking_id}/cancel", headers=headers1)

    # Now the second booking should succeed
    r3 = client.post("/bookings", json=payload, headers=headers2)
    assert r3.status_code == 201


def test_my_bookings(client, db):
    seed_user(db, email="mybk@test.com", password="pass123")
    hotel, room = seed_hotel_with_room(db)
    headers = _auth_header(client, "mybk@test.com", "pass123")

    client.post("/bookings", json={
        "hotel_id": hotel.id, "room_id": room.id,
        "check_in": CHECKIN.isoformat(), "check_out": CHECKOUT.isoformat(), "guests": 1,
    }, headers=headers)

    res = client.get("/bookings/my", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
