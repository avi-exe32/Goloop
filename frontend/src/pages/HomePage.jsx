/*
  HomePage.jsx — dense travel marketplace landing page.

  Sections:
  1. Navy hero + yellow-bordered search bar (overlaps into white content)
  2. Sign-in promo strip
  3. Trending destinations grid  ← data from hotelsApi.popular()
  4. Browse by property type (static content)
  5. Featured stays row          ← sliced from popular() data
*/

import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { hotelsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import HotelCard from '../components/HotelCard'
import './HomePage.css'

/* ---- SVG icons (no emoji) ---- */
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

/* Property type static data — images use picsum seeds for consistency */
const PROP_TYPES = [
  { label: 'Hotels',     seed: 'hotel-lobby'    },
  { label: 'Apartments', seed: 'apartment-room' },
  { label: 'Resorts',    seed: 'resort-pool'    },
  { label: 'Villas',     seed: 'villa-luxury'   },
  { label: 'Cabins',     seed: 'mountain-cabin' },
]

export default function HomePage() {
  /* ---- Search form state ---- */
  const [city,     setCity]     = useState('')
  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests,   setGuests]   = useState('2 adults · 0 children · 1 room')

  /* ---- API data state ---- */
  const [popular,  setPopular]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const navigate     = useNavigate()
  const { isLoggedIn } = useAuth()

  /* Fetch popular destinations once on mount */
  useEffect(() => {
    hotelsApi.popular()
      .then(data  => { setPopular(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [])

  function handleSearch(e) {
    e.preventDefault()  /* Stop browser default form submit (page reload) */
    const params = new URLSearchParams()
    if (city)     params.set('city', city)
    if (checkIn)  params.set('check_in', checkIn)
    if (checkOut) params.set('check_out', checkOut)
    /* Navigate to SearchPage — it reads params from the URL */
    navigate(`/search?${params.toString()}`)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>

      {/* ======== SECTION 1: Navy hero + search bar ======== */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">Find your next stay</h1>
          <p className="hero__subtitle">
            Search deals on hotels, resorts and much more
          </p>

          {/*
            Yellow-bordered search bar — the most important UI element.
            4 segments: Destination | Check-in | Check-out | Guests+rooms
            Followed by the blue search button.
          */}
          <form className="search-bar" onSubmit={handleSearch} role="search">

            <div className="search-bar__seg">
              <label className="search-bar__label" htmlFor="s-dest">Destination</label>
              <input
                id="s-dest"
                className="search-bar__input"
                type="text"
                placeholder="Where are you going?"
                value={city}
                /* Controlled input — React owns the value, not the DOM */
                onChange={e => setCity(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="search-bar__seg">
              <label className="search-bar__label" htmlFor="s-checkin">
                <IconCalendar /> Check-in
              </label>
              <input
                id="s-checkin"
                className="search-bar__input"
                type="date"
                value={checkIn}
                min={today}
                onChange={e => setCheckIn(e.target.value)}
              />
            </div>

            <div className="search-bar__seg">
              <label className="search-bar__label" htmlFor="s-checkout">
                <IconCalendar /> Check-out
              </label>
              <input
                id="s-checkout"
                className="search-bar__input"
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={e => setCheckOut(e.target.value)}
              />
            </div>

            <div className="search-bar__seg">
              <label className="search-bar__label" htmlFor="s-guests">
                <IconUsers /> Guests &amp; rooms
              </label>
              <input
                id="s-guests"
                className="search-bar__input"
                type="text"
                value={guests}
                onChange={e => setGuests(e.target.value)}
                placeholder="2 adults · 1 room"
              />
            </div>

            <button type="submit" className="search-bar__btn">
              <IconSearch /> Search
            </button>
          </form>
        </div>
      </section>

      {/* ======== SECTION 2: White body content ======== */}
      <div className="home-body">
        <div className="container">

          {/* ---- Sign-in promo strip ---- */}
          {!isLoggedIn && (
            <div className="promo-strip">
              <div className="promo-strip__text">
                <h3>Sign in, save 10% or more on select properties</h3>
                <p>Members get exclusive deals and early access to limited offers.</p>
              </div>
              <Link to="/login" className="btn-primary" style={{ flexShrink: 0 }}>
                Sign in
              </Link>
            </div>
          )}

          {/* ---- Trending destinations ---- */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div className="section-header">
              <h2 className="section-title">Trending destinations</h2>
              <Link to="/search">See all properties</Link>
            </div>

            {loading && (
              <div className="state-box"><p>Loading destinations...</p></div>
            )}
            {error && (
              <div className="error-strip">Could not load destinations: {error}</div>
            )}

            {!loading && !error && (
              /*
                .map() transforms the array of hotel objects into React elements.
                `key` must be unique — React uses it to reconcile DOM updates
                without re-rendering elements that haven't changed.
              */
              <div className="destinations-grid">
                {popular.map(hotel => (
                  <HotelCard key={hotel.id} hotel={hotel} variant="vertical" />
                ))}
              </div>
            )}
          </section>

          {/* ---- Browse by property type ---- */}
          <section className="prop-types">
            <h2 className="section-title">Browse by property type</h2>
            <div className="prop-types__row">
              {PROP_TYPES.map(({ label, seed }) => (
                <Link
                  key={label}
                  to={`/search?city=${encodeURIComponent('')}`}
                  className="prop-type-card"
                >
                  <img
                    src={`https://picsum.photos/seed/${seed}/300/220`}
                    alt={label}
                    className="prop-type-card__img"
                    loading="lazy"
                    onError={e => {
                      e.target.onerror = null
                      e.target.src = `https://picsum.photos/seed/${seed}-fallback/300/220`
                    }}
                  />
                  <div className="prop-type-card__label">{label}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* ---- Homes guests love / featured stays ---- */}
          {!loading && popular.length > 0 && (
            <section>
              <div className="section-header">
                <h2 className="section-title">Homes guests love</h2>
                <Link to="/search">More properties</Link>
              </div>
              {/* Slice to show a second row of featured hotels */}
              <div className="featured-grid">
                {popular.slice(0, 4).map(hotel => (
                  <HotelCard key={`feat-${hotel.id}`} hotel={hotel} variant="vertical" />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
