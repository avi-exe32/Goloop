from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Room(Base):
    """
    Represents an inventory tier / room type within a hotel.
    Each room type has a physical capacity and a count of available physical units (total_rooms).
    This design allows multiple distinct bookings for the same room type up to total_rooms,
    while reliably preventing overbooking for overlapping date ranges.
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    room_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False, default="")
    price_per_night = Column(Float, nullable=False, index=True)
    capacity = Column(Integer, nullable=False, default=2)
    total_rooms = Column(Integer, nullable=False, default=3)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room", cascade="all, delete-orphan")
