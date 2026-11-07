import pytest
from backend.tests.conftest import seed_user


def login(client, email, password):
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res


def test_signup_success(client):
    res = client.post("/auth/signup", json={
        "name": "Alice Traveler",
        "email": "alice@test.com",
        "password": "alice123",
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@test.com"
    assert data["user"]["is_admin"] is False


def test_signup_duplicate_email(client, db):
    seed_user(db, email="dup@test.com")
    res = client.post("/auth/signup", json={
        "name": "Duplicate",
        "email": "dup@test.com",
        "password": "pass123",
    })
    assert res.status_code == 409


def test_login_success(client, db):
    seed_user(db, email="login@test.com", password="pass123")
    res = login(client, "login@test.com", "pass123")
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client, db):
    seed_user(db, email="wrong@test.com", password="correct")
    res = login(client, "wrong@test.com", "incorrect")
    assert res.status_code == 401


def test_me_authenticated(client, db):
    seed_user(db, email="me@test.com", password="me123")
    token = login(client, "me@test.com", "me123").json()["access_token"]
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@test.com"


def test_me_unauthenticated(client):
    res = client.get("/auth/me")
    assert res.status_code == 401
