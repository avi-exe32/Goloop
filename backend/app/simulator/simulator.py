"""
backend/app/simulator/simulator.py — Real-time background traffic generator.

WHY run a simulator?
In development and learning projects, testing real-time dashboards, charts, and
concurrency locks is impossible without active traffic.
This simulator acts as an autonomous user population generating realistic traffic:
1. New customer signups
2. Room availability queries and bookings
3. Spontaneous cancellations

WHY call real service functions?
The simulator does NOT insert raw rows into the database. Instead, it calls the
exact same `create_booking()` and `cancel_booking()` service functions that the
REST API calls. This exercises:
- Double-booking concurrency locks
- Date validation logic
- Database write transactions in SQLite WAL mode
"""

import asyncio
import logging
import random
import time
from datetime import date, timedelta
from typing import Optional, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.models.hotel import Hotel
from backend.app.models.room import Room
from backend.app.models.booking import Booking
from backend.app.schemas.booking import BookingCreate
from backend.app.services.booking import create_booking, cancel_booking
from backend.app.services.auth import hash_password
from backend.app.simulator.events import broadcaster

logger = logging.getLogger("simulator")

# Realistic Indian names for simulated guest traffic
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Chiara",
    "Rhea", "Avani", "Prisha", "Ira", "Rohan", "Vikram", "Neha", "Pooja", "Kabir"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Iyer", "Nair", "Rao", "Reddy",
    "Singh", "Gupta", "Deshmukh", "Kulkarni", "Chopra", "Malhotra", "Bhatia"
]

# City popularity weights (Goa, Mumbai, and Delhi receive the highest booking volume)
CITY_WEIGHTS = {
    "Goa": 25,
    "Mumbai": 18,
    "Delhi": 15,
    "Jaipur": 14,
    "Kerala": 12,
    "Udaipur": 8,
    "Rishikesh": 5,
    "Manali": 3,
}


class TrafficSimulator:
    """Manages the background traffic generation loop."""

    def __init__(self):
        self.is_running: bool = False
        self.speed: int = 1  # 1x, 5x, or 20x
        self.seed: Optional[int] = None
        self._task: Optional[asyncio.Task] = None
        self.start_time: Optional[float] = None
        self.total_actions: int = 0
        self.total_bookings: int = 0
        self.total_cancellations: int = 0
        self.total_signups: int = 0
        self.total_conflicts: int = 0

    def start(self, speed: int = 1, seed: Optional[int] = None) -> Dict[str, Any]:
        """Start the traffic simulator background task."""
        if self.is_running:
            return self.get_status()

        if seed is not None:
            self.seed = seed
            random.seed(seed)

        self.speed = speed if speed in [1, 5, 20] else 1
        self.is_running = True
        self.start_time = time.time()
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._run_loop())
        except RuntimeError:
            self._task = None
        logger.info(f"Traffic simulator started at {self.speed}x speed.")
        return self.get_status()

    def stop(self) -> Dict[str, Any]:
        """Stop the simulator."""
        if not self.is_running:
            return self.get_status()

        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None
        logger.info("Traffic simulator stopped.")
        return self.get_status()

    def set_speed(self, speed: int) -> Dict[str, Any]:
        """Update simulation speed multiplier (1x, 5x, 20x)."""
        if speed in [1, 5, 20]:
            self.speed = speed
            logger.info(f"Traffic simulator speed adjusted to {self.speed}x.")
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        """Return runtime metrics and configuration."""
        uptime = round(time.time() - self.start_time, 1) if self.start_time and self.is_running else 0
        return {
            "is_running": self.is_running,
            "speed": self.speed,
            "seed": self.seed,
            "uptime_seconds": uptime,
            "total_actions": self.total_actions,
            "total_bookings": self.total_bookings,
            "total_cancellations": self.total_cancellations,
            "total_signups": self.total_signups,
            "total_conflicts": self.total_conflicts,
        }

    async def _run_loop(self) -> None:
        """Core loop: sleeps 1-5s / speed, then fires a simulated action."""
        try:
            while self.is_running:
                # Interval between actions: 1 to 5 seconds scaled by speed
                delay = random.uniform(1.0, 5.0) / self.speed
                await asyncio.sleep(delay)

                if not self.is_running:
                    break

                try:
                    await self._execute_random_action()
                except Exception as ex:
                    logger.exception(f"Unexpected error in simulator action: {ex}")

        except asyncio.CancelledError:
            pass
        finally:
            self.is_running = False

    async def _execute_random_action(self) -> None:
        """
        Picks an action according to weighted probabilities:
        - 65% chance: New booking
        - 15% chance: Cancellation of an existing booking
        - 20% chance: New customer signup
        """
        dice = random.random()
        db: Session = SessionLocal()
        try:
            if dice < 0.65:
                await self._action_new_booking(db)
            elif dice < 0.80:
                await self._action_cancel_booking(db)
            else:
                await self._action_new_user(db)
        finally:
            db.close()

    async def _action_new_booking(self, db: Session) -> None:
        """Simulates a guest discovering and booking a hotel room."""
        # 1. Pick a random user or create one
        user = db.query(User).filter(User.is_admin == False).order_by(User.id.desc()).first()
        if not user:
            user = self._create_random_user_in_db(db)

        # 2. Pick a weighted city
        cities = list(CITY_WEIGHTS.keys())
        weights = list(CITY_WEIGHTS.values())
        chosen_city = random.choices(cities, weights=weights, k=1)[0]

        # 3. Find hotels in that city
        hotels = db.query(Hotel).filter(Hotel.city == chosen_city).all()
        if not hotels:
            hotels = db.query(Hotel).all()
        if not hotels:
            return

        hotel = random.choice(hotels)
        rooms = db.query(Room).filter(Room.hotel_id == hotel.id).all()
        if not rooms:
            return
        room = random.choice(rooms)

        # 4. Generate realistic dates: 1-30 days in future, staying 1-7 nights
        today = date.today()
        start_offset = random.randint(1, 28)
        # 40% bias toward Friday check-ins (weekends)
        check_in = today + timedelta(days=start_offset)
        stay_length = random.choices([1, 2, 3, 4, 5, 7], weights=[15, 40, 25, 10, 5, 5], k=1)[0]
        check_out = check_in + timedelta(days=stay_length)
        guests = random.randint(1, min(room.capacity, 4))

        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        guest_name = f"{first} {last}"
        guest_email = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@example.com"
        guest_phone = f"+91 9{random.randint(100000000, 999999999)}"

        booking_payload = BookingCreate(
            hotel_id=hotel.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
        )

        try:
            # Exercise the real booking engine with availability checks
            booking = create_booking(db, user_id=user.id, data=booking_payload)
            self.total_actions += 1
            self.total_bookings += 1

            await broadcaster.broadcast("booking_created", {
                "id": booking.id,
                "hotel_name": hotel.name,
                "city": hotel.city,
                "room_type": room.room_type,
                "guest_name": guest_name,
                "check_in": str(booking.check_in),
                "check_out": str(booking.check_out),
                "guests": booking.guests,
                "total_price": booking.total_price,
                "status": "confirmed",
            })
        except HTTPException as ex:
            if ex.status_code == 409:
                # Double-booking capacity limit was reached!
                self.total_conflicts += 1
                await broadcaster.broadcast("booking_conflict", {
                    "hotel_name": hotel.name,
                    "city": hotel.city,
                    "room_type": room.room_type,
                    "reason": "Capacity reached for dates",
                })

    async def _action_cancel_booking(self, db: Session) -> None:
        """Simulates a guest cancelling an upcoming confirmed reservation (~10-15%)."""
        confirmed = (
            db.query(Booking)
            .filter(Booking.status == "confirmed")
            .order_by(Booking.id.desc())
            .limit(50)
            .all()
        )
        if not confirmed:
            return

        booking = random.choice(confirmed)
        try:
            cancel_booking(db, booking_id=booking.id, user_id=booking.user_id, is_admin=True)
            self.total_actions += 1
            self.total_cancellations += 1

            hotel = db.query(Hotel).filter(Hotel.id == booking.hotel_id).first()
            room = db.query(Room).filter(Room.id == booking.room_id).first()

            await broadcaster.broadcast("booking_cancelled", {
                "id": booking.id,
                "hotel_name": hotel.name if hotel else "Hotel",
                "city": hotel.city if hotel else "City",
                "room_type": room.room_type if room else "Room",
                "guest_name": booking.guest_name or "Guest",
                "refund_amount": booking.total_price,
                "status": "cancelled",
            })
        except Exception:
            pass

    async def _action_new_user(self, db: Session) -> None:
        """Simulates a new customer creating an account on Goloop."""
        user = self._create_random_user_in_db(db)
        self.total_actions += 1
        self.total_signups += 1

        await broadcaster.broadcast("user_registered", {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        })

    def _create_random_user_in_db(self, db: Session) -> User:
        """Helper to create and persist a simulated user."""
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower()}{random.randint(100, 9999)}@example.com"

        user = User(
            email=email,
            hashed_password=hash_password("simpass123"),
            name=name,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


# Global singleton simulator instance
simulator = TrafficSimulator()
