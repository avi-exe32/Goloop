from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.booking import BookingCreate, BookingOut
from backend.app.services.auth import get_current_user
from backend.app.services.booking import create_booking, cancel_booking, get_user_bookings

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def book_hotel(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a confirmed booking.
    The double-booking check and insertion happen inside a single transaction
    in booking_service.create_booking so availability is guaranteed to be
    accurate even under concurrent load.
    """
    return create_booking(db, user_id=current_user.id, data=payload)


@router.get("/my", response_model=List[BookingOut])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all bookings belonging to the logged-in user."""
    return get_user_bookings(db, user_id=current_user.id)


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel a confirmed booking.
    The room slot is freed immediately, allowing other guests to book those dates.
    """
    return cancel_booking(db, booking_id=booking_id, user_id=current_user.id)
