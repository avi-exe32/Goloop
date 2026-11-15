/*
  HotelCard.jsx — reusable card displayed in search results and popular destinations.

  WHY a reusable component?
  Both the HomePage and SearchPage show hotel cards with the same layout.
  Instead of duplicating HTML in two places, we extract it into one component
  and pass different data via props. If the design changes, one file to update.
*/

import React from 'react'
import { Link } from 'react-router-dom'
import './HotelCard.css'

export default function HotelCard({ hotel }) {
  // Format the INR price with commas: 12500 -> "12,500"
  const price = hotel.price_per_night_min.toLocaleString('en-IN')

  return (
    /*
      We wrap the whole card in a <Link> so the user can click anywhere on
      the card to go to the hotel detail page — not just a small button.
      React Router's <Link> does client-side navigation (no page reload).
    */
    <Link to={`/hotels/${hotel.id}`} className="hotel-card card">

      {/* Image section — uses the primary_image URL returned by the API */}
      <div className="hotel-card__img-wrap">
        <img
          src={hotel.primary_image || `https://picsum.photos/seed/${hotel.id}/600/400`}
          alt={hotel.name}
          className="hotel-card__img"
          /*
            onError fires if the image URL is broken (e.g. Pexels URL expired).
            We swap it to a guaranteed-working picsum fallback so the card
            never shows a broken image icon.
          */
          onError={(e) => {
            e.target.onerror = null  // Prevent infinite loop if fallback also fails
            e.target.src = `https://picsum.photos/seed/hotel-${hotel.id}/600/400`
          }}
          loading="lazy"  /* Browser loads image only when it's near the viewport */
        />
        <div className="hotel-card__city-badge">{hotel.city}</div>
      </div>

      <div className="hotel-card__body">
        <h3 className="hotel-card__name">{hotel.name}</h3>

        <div className="hotel-card__meta">
          {/* Star rating — gold stars */}
          <span className="rating">{hotel.star_rating.toFixed(1)} stars</span>
        </div>

        {/* Price — shown in INR */}
        <div className="hotel-card__price">
          <span className="price">Rs. {price}</span>
          <span className="price-label"> / night</span>
        </div>
      </div>
    </Link>
  )
}
