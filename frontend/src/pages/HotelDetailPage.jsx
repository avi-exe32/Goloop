/*
  HotelDetailPage.jsx

  Sections:
  1. Breadcrumb
  2. Hotel header (name, stars, location, score)
  3. Image gallery (primary + 3 thumbnails)
  4. Two-column body:
     LEFT  — description, amenities grid, room-type table
     RIGHT — sticky booking form card

  KEY CONCEPTS:
  - useParams: React Router hook to read the :id segment from /hotels/:id
  - Lifting selected room state: the room table (left) and booking form (right)
    share `selectedRoom` state. Keeping it in the parent (this component) means
    both columns always see the same value — no syncing needed.
  - Optimistic UI: the booking card shows a live price calculation before the
    user submits, so they see exactly what they'll pay.
*/

import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { hotelsApi, bookingsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './HotelDetailPage.css'

/* ---- Inline SVG icons — zero emoji ---- */
const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconStar = ({ filled = true }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconSuccess = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="booking-success__icon">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)

/* Convert 5-star scale to 10-point Booking.com style score */
function toScore(stars) { return (stars * 2).toFixed(1) }

function scoreLabel(score) {
  const n = parseFloat(score)
  if (n >= 9)   return 'Superb'
  if (n >= 8.5) return 'Excellent'
  if (n >= 8)   return 'Very good'
  return 'Good'
}

function fmt(n) {
  return Math.round(n).toLocaleString('en-IN')
}

function fallbackImg(id, idx = 1) {
  return `https://picsum.photos/seed/hotel-${id}-${idx}/800/500`
}

/* Get today and tomorrow as ISO strings for default date values */
function todayStr() { return new Date().toISOString().split('T')[0] }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function HotelDetailPage() {
  /*
    useParams reads dynamic URL segments. For route /hotels/:id,
    params.id gives us the hotel id from the current URL.
  */
  const { id } = useParams()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  /* ---- Data state ---- */
  const [hotel,   setHotel]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  /* ---- Booking form state ---- */
  const [selectedRoom, setSelectedRoom] = useState(null)  /* Room object the user clicked */
  const [checkIn,  setCheckIn]  = useState(tomorrowStr())
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [guests,   setGuests]   = useState(1)
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  /* ---- Booking result state ---- */
  const [booking,       setBooking]       = useState(null)   /* Confirmed booking response */
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError,   setBookingError]   = useState(null)

  /* Fetch hotel details once when the page mounts or the id changes */
  useEffect(() => {
    setLoading(true)
    hotelsApi.getById(id)
      .then(data => {
        setHotel(data)
        /* Auto-select the cheapest room by default */
        if (data.rooms?.length > 0) {
          const sorted = [...data.rooms].sort((a, b) => a.price_per_night - b.price_per_night)
          setSelectedRoom(sorted[0])
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  /* Live price calculation — recomputes whenever dates or room changes */
  const nights = (() => {
    if (!checkIn || !checkOut) return 0
    const diff = (new Date(checkOut) - new Date(checkIn)) / 86400000
    return diff > 0 ? diff : 0
  })()

  const roomPrice   = selectedRoom ? selectedRoom.price_per_night * nights : 0
  const taxesAmount = Math.round(roomPrice * 0.12)
  const totalPrice  = roomPrice + taxesAmount

  async function handleBook() {
    if (!selectedRoom) return
    setBookingError(null)
    setBookingLoading(true)
    try {
      /*
        bookingsApi.create sends POST /bookings with the JWT token in
        the Authorization header. The backend:
        1. Validates the token and extracts the user id
        2. Checks room availability (no overlap with existing confirmed bookings)
        3. Inserts the booking and returns the confirmed record
      */
      const result = await bookingsApi.create({
        hotel_id:    hotel.id,
        room_id:     selectedRoom.id,
        check_in:    checkIn,
        check_out:   checkOut,
        guests:      parseInt(guests),
        guest_name:  guestName  || undefined,
        guest_email: guestEmail || undefined,
      })
      setBooking(result)
    } catch (err) {
      setBookingError(err.message)
    } finally {
      setBookingLoading(false)
    }
  }

  /* ---- Render: loading / error ---- */
  if (loading) return (
    <div className="container">
      <div className="state-box" style={{ marginTop: '2rem' }}>
        <p>Loading hotel details...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="container">
      <div className="error-strip" style={{ marginTop: '2rem' }}>{error}</div>
    </div>
  )

  if (!hotel) return null

  /* Collect gallery images — primary first, then the rest */
  const images = hotel.images || []
  const primaryImg = images.find(i => i.is_primary)?.image_url || fallbackImg(hotel.id, 1)
  const thumbImgs  = images.filter(i => !i.is_primary).slice(0, 3).map(i => i.image_url)
  while (thumbImgs.length < 3) thumbImgs.push(fallbackImg(hotel.id, thumbImgs.length + 2))

  /* Amenities: comma-separated string split into array */
  const amenities = hotel.amenities
    ? hotel.amenities.split(',').map(a => a.trim()).filter(Boolean)
    : []

  const score = toScore(hotel.star_rating)

  return (
    <div className="detail-page">
      <div className="container">

        {/* ---- Breadcrumb ---- */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb__sep">&rsaquo;</span>
          <Link to={`/search?city=${encodeURIComponent(hotel.city)}`}>{hotel.city}</Link>
          <span className="breadcrumb__sep">&rsaquo;</span>
          <span>{hotel.name}</span>
        </nav>

        {/* ---- Hotel header ---- */}
        <div className="detail-header">
          <div className="detail-header__left">
            <h1 className="detail-name">{hotel.name}</h1>

            {/* Star row */}
            <div className="detail-stars">
              {Array.from({ length: Math.round(hotel.star_rating) }).map((_, i) => (
                <IconStar key={i} filled />
              ))}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                {hotel.star_rating.toFixed(1)}-star hotel
              </span>
            </div>

            <div className="detail-location">
              <IconPin />
              <span>{hotel.address}</span>
              <a href="#" style={{ marginLeft: '0.25rem' }}>Show on map</a>
            </div>
          </div>

          {/* Score block */}
          <div className="detail-score-block">
            <span className="detail-score-label">{scoreLabel(score)}</span>
            <span className="rating-badge" style={{ fontSize: '1.1rem', minWidth: '2.6rem', height: '2.6rem' }}>
              {score}
            </span>
            <span className="detail-score-reviews">
              {hotel.id * 37 + 120} reviews
            </span>
          </div>
        </div>

        {/* ---- Image gallery ---- */}
        <div className="gallery">
          {/* Primary large image */}
          <div className="gallery__primary">
            <img
              src={primaryImg}
              alt={hotel.name}
              className="gallery__img"
              onError={e => { e.target.onerror = null; e.target.src = fallbackImg(hotel.id, 1) }}
            />
          </div>

          {/* Three thumbnails on the right */}
          {thumbImgs.map((src, idx) => (
            <div key={idx} className="gallery__thumb">
              <img
                src={src}
                alt={`${hotel.name} photo ${idx + 2}`}
                className="gallery__img"
                onError={e => { e.target.onerror = null; e.target.src = fallbackImg(hotel.id, idx + 2) }}
              />
              {/* Show "All photos" overlay on the last thumbnail */}
              {idx === 2 && images.length > 4 && (
                <div className="gallery__overlay">View all {images.length} photos</div>
              )}
            </div>
          ))}
        </div>

        {/* ---- Two-column body ---- */}
        <div className="detail-body">

          {/* ========== LEFT column ========== */}
          <div className="detail-left">

            {/* Description */}
            <div className="detail-card">
              <h2 className="detail-card__title">About this property</h2>
              <p className="detail-desc">{hotel.description}</p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="detail-card">
                <h2 className="detail-card__title">Most popular facilities</h2>
                <div className="amenities-grid">
                  {amenities.map(a => (
                    <div key={a} className="amenity-item">
                      <IconCheck />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room type table */}
            <div className="detail-card">
              <h2 className="detail-card__title">Available room types</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="rooms-table">
                  <thead>
                    <tr>
                      <th>Room type</th>
                      <th>Guests</th>
                      <th>Price per night</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotel.rooms.map(room => {
                      const isSelected = selectedRoom?.id === room.id
                      return (
                        /*
                          Clicking a row sets selectedRoom state, which:
                          1. Highlights this row (room-row--selected class)
                          2. Updates the booking card on the right with the new price
                          This is "lifting state up" — shared state lives in the parent
                          so both table and booking card stay in sync.
                        */
                        <tr
                          key={room.id}
                          className={`room-row${isSelected ? ' room-row--selected' : ''}`}
                          onClick={() => setSelectedRoom(room)}
                        >
                          <td>
                            <div className="room-type-name">{room.room_type}</div>
                            <div className="room-type-desc">{room.description}</div>
                          </td>
                          <td>
                            <div className="room-capacity">
                              <IconUser /> {room.capacity} guest{room.capacity > 1 ? 's' : ''}
                            </div>
                          </td>
                          <td>
                            <div className="room-price">Rs. {fmt(room.price_per_night)}</div>
                            <span className="room-price-night">per night</span>
                          </td>
                          <td>
                            <button
                              className={`select-room-btn${isSelected ? ' select-room-btn--selected' : ''}`}
                              onClick={e => { e.stopPropagation(); setSelectedRoom(room) }}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ========== RIGHT column: booking card ========== */}
          <div>
            <div className="booking-card">
              <div className="booking-card__header">
                <h3>Your booking</h3>
                <p>Pay at the hotel — no prepayment needed</p>
              </div>

              {/* Success state: show confirmation instead of form */}
              {booking ? (
                <div className="booking-card__body">
                  <div className="booking-success">
                    <IconSuccess />
                    <h3>Booking confirmed!</h3>
                    <p>
                      Booking #{booking.id} for <strong>{selectedRoom?.room_type}</strong>
                      <br />
                      {booking.check_in} to {booking.check_out}
                    </p>
                    <p style={{ color: 'var(--green)', fontWeight: 700 }}>
                      Total: Rs. {fmt(booking.total_price)}
                    </p>
                    <Link
                      to="/my-bookings"
                      className="btn-primary"
                      style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                    >
                      View my bookings
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="booking-card__body">

                  {/* Selected room summary */}
                  {selectedRoom && (
                    <div className="booking-room-selected">
                      <strong>{selectedRoom.room_type}</strong>
                      Rs. {fmt(selectedRoom.price_per_night)} / night &nbsp;·&nbsp;
                      Up to {selectedRoom.capacity} guests
                    </div>
                  )}

                  {/* Date inputs */}
                  <div className="form-group">
                    <label htmlFor="bc-checkin">Check-in</label>
                    <input
                      id="bc-checkin"
                      type="date"
                      value={checkIn}
                      min={todayStr()}
                      onChange={e => setCheckIn(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bc-checkout">Check-out</label>
                    <input
                      id="bc-checkout"
                      type="date"
                      value={checkOut}
                      min={checkIn || todayStr()}
                      onChange={e => setCheckOut(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bc-guests">Guests</label>
                    <input
                      id="bc-guests"
                      type="number"
                      min={1}
                      max={selectedRoom?.capacity || 10}
                      value={guests}
                      onChange={e => setGuests(e.target.value)}
                    />
                  </div>

                  {/* Guest info (optional) */}
                  <div className="form-group">
                    <label htmlFor="bc-name">Your name (optional)</label>
                    <input
                      id="bc-name"
                      type="text"
                      placeholder="Full name"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bc-email">Email (optional)</label>
                    <input
                      id="bc-email"
                      type="email"
                      placeholder="For booking confirmation"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                    />
                  </div>

                  {/* Price breakdown — updates live as dates change */}
                  {selectedRoom && nights > 0 && (
                    <div className="booking-price-breakdown">
                      <div className="price-line">
                        <span>Rs. {fmt(selectedRoom.price_per_night)} x {nights} night{nights > 1 ? 's' : ''}</span>
                        <span>Rs. {fmt(roomPrice)}</span>
                      </div>
                      <div className="price-line">
                        <span>Taxes &amp; fees (12%)</span>
                        <span>Rs. {fmt(taxesAmount)}</span>
                      </div>
                      <div className="price-line price-line--total">
                        <span>Total</span>
                        <span>Rs. {fmt(totalPrice)}</span>
                      </div>
                    </div>
                  )}

                  {/* Error from booking attempt */}
                  {bookingError && (
                    <div className="error-strip">{bookingError}</div>
                  )}

                  {/* CTA — show login prompt if not authenticated */}
                  {isLoggedIn ? (
                    <>
                      <button
                        className="booking-cta"
                        onClick={handleBook}
                        disabled={bookingLoading || !selectedRoom || nights <= 0}
                      >
                        {bookingLoading
                          ? 'Confirming...'
                          : nights <= 0
                            ? 'Select valid dates'
                            : 'Confirm booking'
                        }
                      </button>
                      <p className="booking-free-cancel">
                        Free cancellation &middot; Pay at the hotel
                      </p>
                    </>
                  ) : (
                    <div className="booking-no-auth">
                      <Link to={`/login`} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                        Sign in to book
                      </Link>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                        No account? <Link to="/signup">Sign up for free</Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
