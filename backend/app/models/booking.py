from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Booking(Base):
    """
    Represents a reservation made by a user for a specific room and hotel.
    Status can be 'confirmed' or 'cancelled'.
    Double booking prevention logic strictly counts 'confirmed' bookings with
    overlapping check-in/check-out dates.
    When a booking is cancelled, status changes to 'cancelled', which frees
    the room slot immediately without losing the audit history.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)

    check_in = Column(Date, nullable=False, index=True)
    check_out = Column(Date, nullable=False, index=True)
    guests = Column(Integer, nullable=False, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="confirmed", index=True)

    guest_name = Column(String(100), nullable=True)
    guest_email = Column(String(255), nullable=True)
    guest_phone = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="bookings")
    hotel = relationship("Hotel", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
