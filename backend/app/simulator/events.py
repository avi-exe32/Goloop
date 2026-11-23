"""
backend/app/simulator/events.py — In-process asyncio event broadcaster for SSE.

WHY an in-process asyncio.Queue instead of Redis or Kafka?
In distributed enterprise architectures, you would use Redis Pub/Sub, Kafka, or
RabbitMQ to broadcast events across multiple worker processes.
However, since this application runs as a single-process FastAPI service with
zero external accounts or services, an in-process asyncio event broadcaster
provides full live-streaming capability with zero memory overhead, zero latency,
and zero external infrastructure dependencies.

HOW IT WORKS:
1. When an admin browser connects to GET /events/stream, we create an asyncio.Queue
   specifically for that connection and register it in `_subscribers`.
2. When the simulator or API triggers an action (e.g. new booking, cancellation),
   we call `broadcast_event(event_type, data)`.
3. The broadcaster iterates through all active queues and pushes the JSON payload.
4. When the client disconnects, its queue is unregistered to avoid memory leaks.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Set, Dict, Any


class EventBroadcaster:
    """Manages active SSE subscriber queues and broadcasts events to all of them."""

    def __init__(self):
        # Set of active asyncio queues (one per connected SSE client)
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        """Register a new client listener and return its dedicated queue."""
        # Cap queue at 200 items to prevent unbounded memory growth if a client is slow
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        """Unregister a client listener when its SSE connection closes."""
        self._subscribers.discard(queue)

    async def broadcast(self, event_type: str, data: Dict[str, Any]) -> None:
        """
        Broadcast an event to all connected subscriber queues.
        Each event payload includes:
        - event: type identifier (e.g. 'booking_created', 'booking_cancelled')
        - data: payload payload dictionary
        - timestamp: ISO 8601 UTC timestamp
        """
        if not self._subscribers:
            return

        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Put message onto each subscriber's queue without blocking
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                # If a client's buffer is backed up, drop the oldest item to make room
                try:
                    queue.get_nowait()
                    queue.put_nowait(payload)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass

    @property
    def active_listeners(self) -> int:
        """Number of currently connected SSE clients."""
        return len(self._subscribers)


# Global singleton broadcaster instance used across the FastAPI app
broadcaster = EventBroadcaster()
