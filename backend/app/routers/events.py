"""
backend/app/routers/events.py — Server-Sent Events (SSE) streaming and simulator controls.

WHAT IS SSE (Server-Sent Events)?
SSE is a standard web protocol that allows a web server to push live data to
browser clients over a single, persistent HTTP connection using standard
`Content-Type: text/event-stream`. Unlike WebSockets:
- SSE is unidirectional (server -> client), which is all a live dashboard needs.
- SSE runs over standard HTTP/1.1 or HTTP/2 with no firewall or proxy friction.
- Browser `EventSource` has built-in auto-reconnection and event parsing.

HOW SSE FORMAT WORKS:
Every message is plain text separated by double newlines:
  event: booking_created
  data: {"id": 101, "guest_name": "Aarav Sharma", ...}

  : keep-alive
"""

import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt

from backend.app.config import SECRET_KEY, ALGORITHM
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.services.auth import get_current_admin
from backend.app.simulator.events import broadcaster
from backend.app.simulator.simulator import simulator
from sqlalchemy.orm import Session

logger = logging.getLogger("events")

router = APIRouter(tags=["events"])


def _verify_admin_token(token: str, db: Session) -> User:
    """Validate JWT token passed in query parameter and verify user is admin."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired stream authorization token.",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permissions required to subscribe to live telemetry stream.",
        )
    return user


@router.get("/events/stream")
async def events_stream(
    token: Optional[str] = Query(None, description="Admin JWT for EventSource auth"),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events endpoint streaming real-time simulation and system events.

    Browser EventSource API cannot send custom Authorization headers, so we accept
    the admin token via the `?token=` query parameter.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required to subscribe to live events.",
        )

    # Verify authorization
    _verify_admin_token(token, db)

    async def event_generator():
        # Register a new queue for this specific client
        queue = broadcaster.subscribe()
        try:
            # Send initial connection confirmation event
            welcome = {
                "event": "connected",
                "data": {"status": "connected", "active_listeners": broadcaster.active_listeners},
            }
            yield f"data: {json.dumps(welcome)}\n\n"

            while True:
                try:
                    # Wait up to 15 seconds for an event
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive comment line so proxies don't terminate idle sockets
                    yield ": keep-alive\n\n"

        except asyncio.CancelledError:
            # Client disconnected
            pass
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disables proxy buffering in Nginx if deployed
        },
    )


# ---------- Simulator Control Endpoints (Admin Only) ----------

class SimulatorStartRequest(BaseModel):
    speed: int = 1
    seed: Optional[int] = None


class SimulatorSpeedRequest(BaseModel):
    speed: int


@router.get("/admin/simulator/status")
def get_simulator_status(_: User = Depends(get_current_admin)):
    """Return the current simulator running state and performance statistics."""
    return simulator.get_status()


@router.post("/admin/simulator/start")
async def start_simulator(
    payload: SimulatorStartRequest,
    _: User = Depends(get_current_admin),
):
    """Start generating simulated background traffic."""
    return simulator.start(speed=payload.speed, seed=payload.seed)


@router.post("/admin/simulator/stop")
async def stop_simulator(_: User = Depends(get_current_admin)):
    """Stop the simulated background traffic generator."""
    return simulator.stop()


@router.post("/admin/simulator/speed")
async def set_simulator_speed(
    payload: SimulatorSpeedRequest,
    _: User = Depends(get_current_admin),
):
    """Adjust the simulation speed multiplier (1x, 5x, 20x)."""
    return simulator.set_speed(speed=payload.speed)
