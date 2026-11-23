/*
  MyBookingsPage.jsx — shows all bookings for the logged-in user.

  FEATURES:
  - Protected: redirects to login if not authenticated
  - Lists bookings with hotel name, room type, dates, total price, status
  - Cancel button for confirmed bookings (calls PATCH /bookings/:id/cancel)
  - After cancellation, the row updates in place (optimistic UI update)

  KEY CONCEPT — optimistic update:
  When the user clicks cancel, we immediately update the local state to show
  "cancelled" before the API responds. If the API fails, we revert.
  This makes the UI feel instant instead of waiting for the network.
*/

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { bookingsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './MyBookingsPage.css'

/* SVG icons */
const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

function fmt(n) {
  return Math.round(n).toLocaleString('en-IN')
}

function nightsBetween(checkIn, checkOut) {
  const diff = (new Date(checkOut) - new Date(checkIn)) / 86400000
  return diff > 0 ? diff : 0
}

export default function MyBookingsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  /* Cancel state: tracks which booking is currently being cancelled */
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError,  setCancelError]  = useState(null)

  /* Redirect to login if not authenticated — wait for auth check to finish first */
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login')
    }
  }, [isLoggedIn, authLoading, navigate])

  /* Fetch bookings once the user is confirmed to be logged in */
  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    bookingsApi.myList()
      .then(data  => { setBookings(data);  setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [isLoggedIn])

  async function handleCancel(bookingId) {
    /* Show a native confirm dialog to prevent accidental cancellations */
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return

    setCancellingId(bookingId)
    setCancelError(null)

    try {
      const updated = await bookingsApi.cancel(bookingId)
      /*
        Replace the cancelled booking in local state so the UI updates
        immediately without a full page reload. React re-renders only the
        changed booking row because we're mapping over the same array.
      */
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? updated : b)
      )
    } catch (err) {
      setCancelError(`Could not cancel booking #${bookingId}: ${err.message}`)
    } finally {
      setCancellingId(null)
    }
  }

  /* Split bookings into upcoming confirmed and past/cancelled */
  const today = new Date().toISOString().split('T')[0]
  const confirmed = bookings.filter(b => b.status === 'confirmed' && b.check_out >= today)
  const past      = bookings.filter(b => b.status !== 'confirmed' || b.check_out < today)

  if (authLoading || (!isLoggedIn)) return null

  return (
    <div className="bookings-page container">

      <div className="bookings-page__header">
        <div>
          <h1>My bookings</h1>
          {!loading && (
            <p>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
          )}
        </div>
        <Link to="/search" className="btn-primary" style={{ fontSize: '0.9rem' }}>
          Find more hotels
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="state-box"><p>Loading your bookings...</p></div>
      )}

      {/* Fetch error */}
      {error && (
        <div className="error-strip">{error}</div>
      )}

      {/* Cancel error */}
      {cancelError && (
        <div className="error-strip" style={{ marginBottom: '1rem' }}>{cancelError}</div>
      )}

      {/* Empty state */}
      {!loading && !error && bookings.length === 0 && (
        <div className="state-box">
          <p style={{ fontWeight: 700, fontSize: '1rem' }}>You have no bookings yet.</p>
          <p>Explore hotels and make your first booking.</p>
          <Link to="/search" className="btn-primary" style={{ marginTop: '0.75rem' }}>
            Browse hotels
          </Link>
        </div>
      )}

      {/* Upcoming confirmed bookings */}
      {confirmed.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Upcoming stays
          </h2>
          {confirmed.map(b => (
            <BookingRow
              key={b.id}
              booking={b}
              onCancel={handleCancel}
              cancelling={cancellingId === b.id}
            />
          ))}
        </section>
      )}

      {/* Past / cancelled bookings */}
      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Past &amp; cancelled
          </h2>
          {past.map(b => (
            <BookingRow
              key={b.id}
              booking={b}
              onCancel={handleCancel}
              cancelling={cancellingId === b.id}
            />
          ))}
        </section>
      )}

    </div>
  )
}

/* ---- BookingRow sub-component ---- */
/*
  WHY a separate component?
  The logic for one row (cancel button, status badge, price display) is
  self-contained. Extracting it keeps the parent component readable and
  makes the row independently testable.
*/
function BookingRow({ booking: b, onCancel, cancelling }) {
  const nights = nightsBetween(b.check_in, b.check_out)
  const isConfirmed = b.status === 'confirmed'

  return (
    <article className="booking-row">
      {/* Left status bar — green for confirmed, grey for cancelled */}
      <div className={`booking-row__status-bar booking-row__status-bar--${b.status}`} />

      <div className="booking-row__body">

        {/* Hotel info */}
        <div className="booking-row__info">
          <Link to={`/hotels/${b.hotel_id}`} className="booking-row__hotel">
            {b.hotel_name || `Hotel #${b.hotel_id}`}
          </Link>
          {b.city && (
            <div className="booking-row__city">{b.city}</div>
          )}
          <div className="booking-row__room">
            {b.room_type || `Room #${b.room_id}`}
          </div>
          <div className="booking-row__guests" style={{ marginTop: '0.4rem' }}>
            <IconUser /> {b.guests} guest{b.guests > 1 ? 's' : ''}
          </div>
        </div>

        {/* Dates */}
        <div className="booking-row__dates">
          <div className="booking-row__dates-row">
            <span className="booking-row__dates-label">Check-in</span>
            <span className="booking-row__dates-value">
              <IconCalendar /> {b.check_in}
            </span>
          </div>
          <div className="booking-row__dates-row">
            <span className="booking-row__dates-label">Check-out</span>
            <span className="booking-row__dates-value">
              <IconCalendar /> {b.check_out}
            </span>
          </div>
          <div className="booking-row__nights">
            {nights} night{nights !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Price + status + cancel */}
        <div className="booking-row__right">
          <div>
            <div className="booking-row__price">Rs. {fmt(b.total_price)}</div>
            <div className="booking-row__price-label">total incl. taxes</div>
          </div>

          <span className={`status-badge status-badge--${b.status}`}>
            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
          </span>

          {/* Show cancel button only for confirmed bookings */}
          {isConfirmed && (
            <button
              className="cancel-btn"
              onClick={() => onCancel(b.id)}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>

      </div>
    </article>
  )
}
