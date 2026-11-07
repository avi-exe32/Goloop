from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------- Booking ----------

class BookingCreate(BaseModel):
    hotel_id: int
    room_id: int
    check_in: date
    check_out: date
    guests: int = Field(..., ge=1)
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    user_id: int
    hotel_id: int
    room_id: int
    check_in: date
    check_out: date
    guests: int
    total_price: float
    status: str
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    created_at: datetime

    # Nested human-readable names returned for display convenience
    hotel_name: Optional[str] = None
    room_type: Optional[str] = None
    city: Optional[str] = None

    model_config = {"from_attributes": True}
