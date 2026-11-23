"""
backend/tests/test_simulator.py — Unit and integration tests for the traffic simulator
and SSE live streaming endpoints.
"""

import pytest
from backend.app.services.auth import create_access_token
from backend.app.simulator.events import broadcaster
from backend.tests.conftest import seed_user


def test_simulator_status_unauthorized(client):
    """Anonymous callers cannot access simulator telemetry."""
    res = client.get("/admin/simulator/status")
    assert res.status_code == 401


def test_simulator_status_forbidden_for_normal_user(client, db):
    """Regular logged-in users cannot access admin simulator endpoints."""
    user = seed_user(db, email="user_sim@test.com", is_admin=False)
    token = create_access_token({"sub": str(user.id)})
    res = client.get(
        "/admin/simulator/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_simulator_lifecycle_and_speed_control(client, db):
    """Admin can read status, start, adjust speed, and stop the simulator."""
    admin = seed_user(db, email="admin_sim@test.com", is_admin=True)
    token = create_access_token({"sub": str(admin.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Initial status
    res = client.get("/admin/simulator/status", headers=headers)
    assert res.status_code == 200
    assert "is_running" in res.json()
    assert "speed" in res.json()

    # Start
    res = client.post("/admin/simulator/start", json={"speed": 5, "seed": 42}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_running"] is True
    assert data["speed"] == 5

    # Change speed to 20x
    res = client.post("/admin/simulator/speed", json={"speed": 20}, headers=headers)
    assert res.status_code == 200
    assert res.json()["speed"] == 20

    # Stop
    res = client.post("/admin/simulator/stop", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_running"] is False


def test_events_stream_auth_guard(client, db):
    """Stream endpoint rejects requests missing token or with non-admin token."""
    # 1. No token
    res = client.get("/events/stream")
    assert res.status_code == 401

    # 2. Non-admin token
    user = seed_user(db, email="regular_stream@test.com", is_admin=False)
    token = create_access_token({"sub": str(user.id)})
    res = client.get(f"/events/stream?token={token}")
    assert res.status_code == 403


def test_event_broadcaster_subscribe_and_broadcast():
    """Verify that EventBroadcaster queues receive published events."""
    import asyncio

    async def _runner():
        queue = broadcaster.subscribe()
        try:
            await broadcaster.broadcast("test_event", {"message": "hello telemetry"})
            item = queue.get_nowait()
            assert item["event"] == "test_event"
            assert item["data"]["message"] == "hello telemetry"
            assert "timestamp" in item
        finally:
            broadcaster.unsubscribe(queue)

    asyncio.run(_runner())
