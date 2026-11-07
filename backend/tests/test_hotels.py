import pytest
from backend.tests.conftest import seed_hotel_with_room


def test_search_no_filter(client, db):
    seed_hotel_with_room(db, city="Jaipur")
    res = client.get("/hotels/search")
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_search_by_city(client, db):
    seed_hotel_with_room(db, city="Manali")
    res = client.get("/hotels/search?city=manali")
    assert res.status_code == 200
    assert all("Manali" in h["city"] for h in res.json())


def test_search_price_filter(client, db):
    seed_hotel_with_room(db, city="Kerala", price=2000.0)
    seed_hotel_with_room(db, city="Kerala", price=8000.0)
    res = client.get("/hotels/search?city=Kerala&max_price=5000")
    assert res.status_code == 200
    for h in res.json():
        assert h["price_per_night_min"] <= 5000


def test_get_hotel_detail(client, db):
    hotel, _ = seed_hotel_with_room(db)
    res = client.get(f"/hotels/{hotel.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == hotel.id
    assert "rooms" in data
    assert "images" in data


def test_get_hotel_not_found(client):
    res = client.get("/hotels/99999")
    assert res.status_code == 404


def test_popular_destinations(client, db):
    seed_hotel_with_room(db, city="Udaipur")
    res = client.get("/hotels/popular")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
