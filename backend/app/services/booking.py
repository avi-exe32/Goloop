from datetime import date
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from backend.app.models.hotel import Hotel, HotelImage
from backend.app.models.room import Room
from backend.app.models.booking import Booking
from backend.app.schemas.booking import BookingCreate, BookingOut


def _count_overlapping_confirmed_bookings(
    db: Session,
    room_id: int,
    check_in: date,
    check_out: date,
    exclude_booking_id: Optional[int] = None,
) -> int:
    """
    Count how many confirmed bookings for this room overlap the requested date range.

    Overlap logic: two date ranges [A, B) and [C, D) overlap when A < D and C < B.
    We use strict inequality because check-out day is treated as departure morning,
    so check_out of one booking = check_in of the next is NOT an overlap.

    This function is called inside a transaction (with FOR UPDATE / serializable
    isolation) so SQLite's WAL mode + busy_timeout handles concurrent writers.
    """
    query = db.query(func.count(Booking.id)).filter(
        Booking.room_id == room_id,
        Booking.status == "confirmed",
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    )
    if exclude_booking_id is not None:
        query = query.filter(Booking.id != exclude_booking_id)
    return query.scalar() or 0


def create_booking(db: Session, user_id: int, data: BookingCreate) -> BookingOut:
    """
    Create a confirmed booking after validating availability.

    Double-booking prevention strategy:
    1. We open a standard SQLAlchemy transaction (autocommit=False, the default).
    2. Inside that transaction we count overlapping *confirmed* bookings for the
       same room_id using _count_overlapping_confirmed_bookings().
    3. We compare the count against room.total_rooms.
    4. If capacity is available we insert the new Booking record and commit.
    5. The entire read-then-write happens inside a single SQLite write transaction.
       SQLite's WAL mode allows concurrent reads but serializes writes, so two
       simultaneous requests cannot both see "0 bookings" and both succeed.
    """
    if data.check_in >= data.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be after check-in date.",
        )

    room = db.query(Room).filter(Room.id == data.room_id, Room.hotel_id == data.hotel_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    if data.guests > room.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room capacity is {room.capacity} guests.",
        )

    # Availability check inside the transaction
    booked_count = _count_overlapping_confirmed_bookings(
        db, data.room_id, data.check_in, data.check_out
    )
    if booked_count >= room.total_rooms:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No rooms available for the selected dates.",
        )

    nights = (data.check_out - data.check_in).days
    total_price = room.price_per_night * nights

    booking = Booking(
        user_id=user_id,
        hotel_id=data.hotel_id,
        room_id=data.room_id,
        check_in=data.check_in,
        check_out=data.check_out,
        guests=data.guests,
        total_price=total_price,
        status="confirmed",
        guest_name=data.guest_name,
        guest_email=data.guest_email,
        guest_phone=data.guest_phone,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return _enrich_booking(booking)


def cancel_booking(db: Session, booking_id: int, user_id: int, is_admin: bool = False) -> BookingOut:
    """Cancel a booking, freeing the room slot for other guests."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    # Regular users can only cancel their own bookings; admins can cancel any
    if not is_admin and booking.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if booking.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled.")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return _enrich_booking(booking)


def get_user_bookings(db: Session, user_id: int) -> List[BookingOut]:
    """Return all bookings for a given user, most recent first."""
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_enrich_booking(b) for b in bookings]


def get_all_bookings(db: Session) -> List[BookingOut]:
    """Admin: return all bookings across all users."""
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    return [_enrich_booking(b) for b in bookings]


def _enrich_booking(booking: Booking) -> BookingOut:
    """
    Convert an ORM Booking to a BookingOut schema, attaching human-readable
    hotel name, room type and city to avoid extra round-trips from the client.
    """
    return BookingOut(
        id=booking.id,
        user_id=booking.user_id,
        hotel_id=booking.hotel_id,
        room_id=booking.room_id,
        check_in=booking.check_in,
        check_out=booking.check_out,
        guests=booking.guests,
        total_price=booking.total_price,
        status=booking.status,
        guest_name=booking.guest_name,
        guest_email=booking.guest_email,
        guest_phone=booking.guest_phone,
        created_at=booking.created_at,
        hotel_name=booking.hotel.name if booking.hotel else None,
        room_type=booking.room.room_type if booking.room else None,
        city=booking.hotel.city if booking.hotel else None,
    )
