from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.hotel import Hotel, HotelImage
from backend.app.models.room import Room
from backend.app.schemas.hotel import (
    HotelCreate, HotelUpdate, HotelOut,
    RoomCreate, RoomUpdate, RoomOut,
)
from backend.app.schemas.booking import BookingOut
from backend.app.services.auth import get_current_admin
from backend.app.services.booking import get_all_bookings, cancel_booking

router = APIRouter(prefix="/admin", tags=["admin"])


# ----- Hotels CRUD -----

@router.post("/hotels", response_model=HotelOut, status_code=status.HTTP_201_CREATED)
def admin_create_hotel(
    payload: HotelCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hotel = Hotel(
        name=payload.name,
        city=payload.city,
        address=payload.address,
        description=payload.description,
        star_rating=payload.star_rating,
        amenities=payload.amenities,
        price_per_night_min=0.0,
    )
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return HotelOut.model_validate(hotel)


@router.patch("/hotels/{hotel_id}", response_model=HotelOut)
def admin_update_hotel(
    hotel_id: int,
    payload: HotelUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hotel, field, value)

    db.commit()
    db.refresh(hotel)
    return HotelOut.model_validate(hotel)


@router.delete("/hotels/{hotel_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_hotel(
    hotel_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found.")
    db.delete(hotel)
    db.commit()


# ----- Rooms CRUD -----

@router.post("/hotels/{hotel_id}/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def admin_create_room(
    hotel_id: int,
    payload: RoomCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found.")

    room = Room(
        hotel_id=hotel_id,
        room_type=payload.room_type,
        description=payload.description,
        price_per_night=payload.price_per_night,
        capacity=payload.capacity,
        total_rooms=payload.total_rooms,
    )
    db.add(room)
    db.flush()

    # Keep the hotel's cached minimum price in sync after adding a new room
    _refresh_hotel_min_price(db, hotel)
    db.commit()
    db.refresh(room)
    return RoomOut.model_validate(room)


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def admin_update_room(
    room_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)

    hotel = db.query(Hotel).filter(Hotel.id == room.hotel_id).first()
    if hotel:
        _refresh_hotel_min_price(db, hotel)

    db.commit()
    db.refresh(room)
    return RoomOut.model_validate(room)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    hotel = db.query(Hotel).filter(Hotel.id == room.hotel_id).first()
    db.delete(room)
    db.flush()

    if hotel:
        _refresh_hotel_min_price(db, hotel)

    db.commit()


# ----- Bookings view and cancel -----

@router.get("/bookings", response_model=List[BookingOut])
def admin_all_bookings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Return every booking in the system for admin oversight."""
    return get_all_bookings(db)


@router.patch("/bookings/{booking_id}/cancel", response_model=BookingOut)
def admin_cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Admin can cancel any booking."""
    return cancel_booking(db, booking_id=booking_id, user_id=current_admin.id, is_admin=True)


# ----- Hotel Images -----

@router.post("/hotels/{hotel_id}/images", status_code=status.HTTP_201_CREATED)
def admin_add_image(
    hotel_id: int,
    image_url: str,
    caption: Optional[str] = None,
    is_primary: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found.")

    if is_primary:
        # Demote any existing primary image before assigning the new one
        db.query(HotelImage).filter(
            HotelImage.hotel_id == hotel_id, HotelImage.is_primary == True
        ).update({"is_primary": False})

    image = HotelImage(
        hotel_id=hotel_id,
        image_url=image_url,
        caption=caption,
        is_primary=is_primary,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return {"id": image.id, "image_url": image.image_url}


# ----- Helpers -----

def _refresh_hotel_min_price(db: Session, hotel: Hotel) -> None:
    """
    Recompute and persist the hotel's cached minimum room price.
    We store this denormalized value on the hotel row so search/sort queries
    don't need a subquery or aggregate join on every request.
    """
    from sqlalchemy import func
    min_price = (
        db.query(func.min(Room.price_per_night))
        .filter(Room.hotel_id == hotel.id)
        .scalar()
    )
    hotel.price_per_night_min = min_price or 0.0
