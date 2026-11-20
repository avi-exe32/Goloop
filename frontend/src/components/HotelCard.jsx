/*
  HotelCard.jsx — renders in two visual modes via the `variant` prop:
    - "vertical"   → compact grid card (home page)
    - "horizontal" → wide listing row  (search results, Booking.com style)

  WHY the variant pattern?
  Both views show the same data from the same API, but the visual density
  and layout are very different. One component with a prop is cleaner than
  two separate files that would drift out of sync.
*/

import React from 'react'
import { Link } from 'react-router-dom'
import './HotelCard.css'

/* ---- SVG icons (no emoji) ---- */
const IconPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

/* Filled yellow star for ratings */
const IconStar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

/*
  Deterministic rating score derived from the hotel's star_rating.
  Booking.com uses a 10-point scale (e.g. "8.8 Excellent").
  We map our 5-star scale linearly: 4.6 stars → 9.2/10 score.
*/
function toScore(starRating) {
  return (starRating * 2).toFixed(1)
}

function scoreLabel(score) {
  const n = parseFloat(score)
  if (n >= 9)   return 'Superb'
  if (n >= 8.5) return 'Excellent'
  if (n >= 8)   return 'Very good'
  if (n >= 7)   return 'Good'
  return 'Pleasant'
}

/*
  Fake discounted "original" price for display purposes.
  We show a crossed-out +20% price to suggest a deal.
  Replace with real promotional pricing logic in a production app.
*/
function originalPrice(price) {
  return Math.round(price * 1.22 / 100) * 100
}

/* Render N filled star SVGs up to 5 */
function StarRow({ count }) {
  return (
    <span className="hotel-card__stars">
      {Array.from({ length: Math.round(count) }).map((_, i) => <IconStar key={i} />)}
    </span>
  )
}

/* Comma-formatted INR price: 12500 → "12,500" */
function fmt(n) {
  return Math.round(n).toLocaleString('en-IN')
}

/* Pick the first two amenities as badge tags */
function amenityTags(amenitiesStr) {
  if (!amenitiesStr) return []
  return amenitiesStr.split(',').map(a => a.trim()).filter(Boolean).slice(0, 2)
}

/* Deterministic "rooms left" number so it looks realistic */
function urgencyCount(hotelId) {
  return (hotelId % 4) + 1
}

/* Fallback image URL using picsum with a stable seed */
function fallbackSrc(hotel) {
  return `https://picsum.photos/seed/hotel-${hotel.id}/600/400`
}

export default function HotelCard({ hotel, variant = 'vertical' }) {
  const score   = toScore(hotel.star_rating)
  const price   = hotel.price_per_night_min
  const origP   = originalPrice(price)
  const urgency = urgencyCount(hotel.id)
  const tags    = amenityTags(hotel.amenities)
  const imgSrc  = hotel.primary_image || fallbackSrc(hotel)

  /* ---- Vertical grid card (home page popular destinations) ---- */
  if (variant === 'vertical') {
    return (
      <Link to={`/hotels/${hotel.id}`} className="hotel-card hotel-card--vertical">

        <div className="hotel-card__img-wrap">
          <img
            src={imgSrc}
            alt={hotel.name}
            className="hotel-card__img"
            loading="lazy"
            onError={e => { e.target.onerror = null; e.target.src = fallbackSrc(hotel) }}
          />
          <div className="hotel-card__city-badge">{hotel.city}</div>
        </div>

        <div className="hotel-card__body">
          <div className="hotel-card__name">{hotel.name}</div>
          <StarRow count={hotel.star_rating} />

          <div className="hotel-card__price-row">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
              Rs. {fmt(origP)}
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>Rs. {fmt(price)}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}> / night</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  /* ---- Horizontal listing card (search results page) ---- */
  return (
    <article className="hotel-card hotel-card--horizontal">

      {/* Left: image thumbnail — click goes to detail page */}
      <Link to={`/hotels/${hotel.id}`} className="hotel-card__img-wrap" tabIndex={-1} aria-hidden="true">
        <img
          src={imgSrc}
          alt={hotel.name}
          className="hotel-card__img"
          loading="lazy"
          onError={e => { e.target.onerror = null; e.target.src = fallbackSrc(hotel) }}
        />
      </Link>

      {/* Middle: hotel info */}
      <div className="hotel-card__middle">

        {/* Hotel name as a blue link */}
        <Link to={`/hotels/${hotel.id}`} className="hotel-card__name">
          {hotel.name}
        </Link>

        {/* Star rating row */}
        <StarRow count={hotel.star_rating} />

        {/* Location */}
        <div className="hotel-card__location">
          <IconPin />
          <span>{hotel.city}</span>
          <a href="#" style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}>Show on map</a>
        </div>

        {/* Top amenity tags */}
        {tags.length > 0 && (
          <div className="hotel-card__amenity-tags">
            {tags.map(t => (
              <span key={t} className="hotel-card__amenity-tag">{t}</span>
            ))}
          </div>
        )}

        {/* Green free cancellation text — a key trust signal on travel sites */}
        <div className="hotel-card__free-cancel">
          Free cancellation · No prepayment needed
        </div>

        {/* Red urgency text to encourage action */}
        <div className="hotel-card__urgency">
          Only {urgency} room{urgency > 1 ? 's' : ''} left at this price
        </div>
      </div>

      {/* Right: score + price + CTA */}
      <div className="hotel-card__right">

        {/* Rating score block */}
        <div style={{ width: '100%' }}>
          <div className="hotel-card__rating-row">
            <span className="hotel-card__rating-label">{scoreLabel(score)}</span>
            {/* Navy rounded badge matching Booking.com style */}
            <span className="rating-badge">{score}</span>
          </div>
          <div className="hotel-card__review-count">
            {(hotel.id * 37 + 120)} reviews
          </div>
        </div>

        {/* Price block */}
        <div className="hotel-card__price-block">
          {/* Crossed-out original price */}
          <div className="price-original">Rs. {fmt(origP)}</div>
          {/* Final price — large and bold */}
          <div className="price">Rs. {fmt(price)}</div>
          <div className="hotel-card__taxes">+Rs. {fmt(price * 0.12)} taxes &amp; fees</div>
        </div>

        {/* CTA button */}
        <Link to={`/hotels/${hotel.id}`} className="hotel-card__avail-btn">
          See availability
        </Link>
      </div>
    </article>
  )
}
