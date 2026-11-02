from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Hotel(Base):
    """
    Represents a property listing in a given destination city.
    Minimum price is cached directly on the hotel record so search and sorting
    can execute single fast SELECT queries without joining or aggregating rooms every time.
    """
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    address = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    star_rating = Column(Float, nullable=False, default=4.0)
    amenities = Column(Text, nullable=False, default="")
    price_per_night_min = Column(Float, nullable=False, default=0.0, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    images = relationship("HotelImage", back_populates="hotel", cascade="all, delete-orphan", order_by="HotelImage.is_primary.desc()")
    rooms = relationship("Room", back_populates="hotel", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="hotel", cascade="all, delete-orphan")


class HotelImage(Base):
    """
    Stores image gallery URLs for a hotel.
    The primary image is prioritized as the listing thumbnail on search and home pages.
    """
    __tablename__ = "hotel_images"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)

    hotel = relationship("Hotel", back_populates="images")
