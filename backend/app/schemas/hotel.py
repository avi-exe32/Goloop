from typing import Optional, List
from pydantic import BaseModel, Field


# ---------- Hotel Image ----------

class HotelImageOut(BaseModel):
    id: int
    image_url: str
    caption: Optional[str] = None
    is_primary: bool

    model_config = {"from_attributes": True}


# ---------- Room ----------

class RoomCreate(BaseModel):
    room_type: str = Field(..., min_length=2, max_length=100)
    description: str = ""
    price_per_night: float = Field(..., gt=0)
    capacity: int = Field(..., ge=1)
    total_rooms: int = Field(..., ge=1)


class RoomUpdate(BaseModel):
    room_type: Optional[str] = None
    description: Optional[str] = None
    price_per_night: Optional[float] = Field(None, gt=0)
    capacity: Optional[int] = Field(None, ge=1)
    total_rooms: Optional[int] = Field(None, ge=1)


class RoomOut(BaseModel):
    id: int
    hotel_id: int
    room_type: str
    description: str
    price_per_night: float
    capacity: int
    total_rooms: int

    model_config = {"from_attributes": True}


# ---------- Hotel ----------

class HotelCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    star_rating: float = Field(..., ge=1.0, le=5.0)
    amenities: str = ""


class HotelUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    star_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    amenities: Optional[str] = None


class HotelOut(BaseModel):
    id: int
    name: str
    city: str
    address: str
    description: str
    star_rating: float
    amenities: str
    price_per_night_min: float
    images: List[HotelImageOut] = []
    rooms: List[RoomOut] = []

    model_config = {"from_attributes": True}


class HotelSummary(BaseModel):
    """Lightweight projection used in search results and home page cards."""
    id: int
    name: str
    city: str
    star_rating: float
    price_per_night_min: float
    primary_image: Optional[str] = None

    model_config = {"from_attributes": True}
