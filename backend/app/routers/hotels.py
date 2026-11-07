from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.hotel import Hotel, HotelImage
from backend.app.schemas.hotel import HotelOut, HotelSummary

router = APIRouter(prefix="/hotels", tags=["hotels"])


def _build_summary(hotel: Hotel) -> HotelSummary:
    """Pick the primary image URL for use in listing cards."""
    primary_image = None
    for img in hotel.images:
        if img.is_primary:
            primary_image = img.image_url
            break
    if primary_image is None and hotel.images:
        primary_image = hotel.images[0].image_url

    return HotelSummary(
        id=hotel.id,
        name=hotel.name,
        city=hotel.city,
        star_rating=hotel.star_rating,
        price_per_night_min=hotel.price_per_night_min,
        primary_image=primary_image,
    )


@router.get("/search", response_model=List[HotelSummary])
def search_hotels(
    city: Optional[str] = Query(None, description="Destination city"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query("price", description="'price' or 'rating'"),
    db: Session = Depends(get_db),
):
    """
    Search hotels with optional city filter, price range, and rating filter.
    Returns lightweight summaries suitable for listing cards.
    """
    query = db.query(Hotel)

    if city:
        # Case-insensitive city filter using SQLite LIKE
        query = query.filter(Hotel.city.ilike(f"%{city}%"))
    if min_price is not None:
        query = query.filter(Hotel.price_per_night_min >= min_price)
    if max_price is not None:
        query = query.filter(Hotel.price_per_night_min <= max_price)
    if min_rating is not None:
        query = query.filter(Hotel.star_rating >= min_rating)

    # Sort in the database layer so we don't load all rows just to sort in Python
    if sort_by == "rating":
        query = query.order_by(Hotel.star_rating.desc())
    else:
        query = query.order_by(Hotel.price_per_night_min.asc())

    hotels = query.all()
    return [_build_summary(h) for h in hotels]


@router.get("/popular", response_model=List[HotelSummary])
def popular_destinations(limit: int = Query(8, ge=1, le=32), db: Session = Depends(get_db)):
    """
    Return one representative hotel per city for the home page destinations section.
    We pick the highest-rated hotel in each city to surface the best options first.
    """
    # Subquery: highest rated hotel id per city
    from sqlalchemy import func
    subq = (
        db.query(func.max(Hotel.star_rating).label("max_rating"), Hotel.city)
        .group_by(Hotel.city)
        .subquery()
    )
    hotels = (
        db.query(Hotel)
        .join(subq, (Hotel.city == subq.c.city) & (Hotel.star_rating == subq.c.max_rating))
        .order_by(Hotel.star_rating.desc())
        .limit(limit)
        .all()
    )
    return [_build_summary(h) for h in hotels]


@router.get("/{hotel_id}", response_model=HotelOut)
def get_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """Return full hotel details including gallery images and room types."""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found.")
    return HotelOut.model_validate(hotel)
