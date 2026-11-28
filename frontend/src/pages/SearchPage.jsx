/*
  SearchPage.jsx — search results with sidebar filters and horizontal hotel cards.

  KEY CONCEPTS for learning:
  - useSearchParams: reads/writes URL query params (?city=Goa&sort=price).
    The URL is the source of truth for what search is active, so users can
    share or bookmark results, and browser Back works correctly.
  - Controlled inputs: each filter input is driven by React state. When the
    user changes a value, setState fires, re-rendering the input with the new
    value. The URL only updates when "Apply" is clicked or sort changes.
*/

import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { hotelsApi } from '../api/client'
import HotelCard from '../components/HotelCard'
import './SearchPage.css'

/* SVG icon for the map banner */
const IconMap = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)

/* Star rating filter options */
const STAR_OPTIONS = [
  { label: '5 stars', value: '5'   },
  { label: '4 stars', value: '4'   },
  { label: '3 stars', value: '3'   },
]

/* Common amenity checkboxes — purely cosmetic in Phase 3, wired to API in Phase 5 */
const AMENITY_OPTIONS = [
  'Free WiFi', 'Swimming Pool', 'Spa', 'Free Parking', 'Restaurant'
]

export default function SearchPage() {
  /*
    useSearchParams gives read + write access to the URL's ?key=value string.
    Reading: searchParams.get('city')
    Writing: setSearchParams({ city: 'Goa', sort_by: 'price' })
    Writing REPLACES the whole query string, so we merge carefully.
  */
  const [searchParams, setSearchParams] = useSearchParams()

  /* ---- Local filter state — initialised from the URL so values persist on refresh ---- */
  const [city,       setCity]      = useState(searchParams.get('city')       || '')
  const [minPrice,   setMinPrice]  = useState(searchParams.get('min_price')  || '')
  const [maxPrice,   setMaxPrice]  = useState(searchParams.get('max_price')  || '')
  const [stars,      setStars]     = useState(searchParams.get('min_rating') || '')
  const [sortBy,     setSortBy]    = useState(searchParams.get('sort_by')    || 'price')

  /* ---- Results state ---- */
  const [hotels,  setHotels]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  /*
    useEffect runs after render. The dependency [searchParams.toString()] means:
    "re-run this effect whenever the URL query string changes."
    .toString() converts the URLSearchParams object to a string so React can
    compare it correctly — objects are always !== each other in JS even if they
    have the same keys, but strings can be compared with ===.
  */
  useEffect(() => {
    setLoading(true)
    setError(null)

    /* Always read filter values FROM THE URL, not from local state.
       This keeps the API call in sync with what's in the address bar. */
    const params = {
      city:       searchParams.get('city')       || '',
      min_price:  searchParams.get('min_price')  || '',
      max_price:  searchParams.get('max_price')  || '',
      min_rating: searchParams.get('min_rating') || '',
      sort_by:    searchParams.get('sort_by')    || 'price',
    }

    hotelsApi.search(params)
      .then(data  => { setHotels(data);  setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })

  }, [searchParams.toString()])

  /* Push current form state into the URL — triggers the useEffect above */
  function applyFilters(e) {
    e.preventDefault()
    const next = {}
    if (city)     next.city       = city
    if (minPrice) next.min_price  = minPrice
    if (maxPrice) next.max_price  = maxPrice
    if (stars)    next.min_rating = stars
    next.sort_by = sortBy
    setSearchParams(next)
  }

  function resetFilters() {
    setCity(''); setMinPrice(''); setMaxPrice(''); setStars(''); setSortBy('price')
    setSearchParams({})
  }

  /* Inline sort change — doesn't require re-submitting the whole form */
  function handleSort(value) {
    setSortBy(value)
    const next = Object.fromEntries(searchParams.entries())
    next.sort_by = value
    setSearchParams(next)
  }

  const cityLabel = searchParams.get('city')

  return (
    <div className="search-page container">

      {/* ---- Page heading ---- */}
      <div className="search-page__header">
        <h1>
          {cityLabel ? `${cityLabel}: hotels` : 'All hotels'}
        </h1>
        <p>
          {loading
            ? 'Searching...'
            : `${hotels.length} ${hotels.length === 1 ? 'property' : 'properties'} found`
          }
        </p>
      </div>

      {/* ---- Two-column layout ---- */}
      <div className="search-layout">

        {/* ========== LEFT: Filter sidebar ========== */}
        <aside>
          <form className="filter-sidebar" onSubmit={applyFilters}>

            {/* Map banner */}
            <div className="filter-sidebar__map-banner">
              <IconMap /> Show on map
            </div>

            {/* Price range */}
            <div className="filter-group">
              <div className="filter-group__title">Your budget (per night)</div>
              <div className="price-inputs">
                <div className="price-input-wrap">
                  <span className="currency-prefix">Rs.</span>
                  <input
                    type="number"
                    placeholder="Min"
                    min={0}
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="price-input-wrap">
                  <span className="currency-prefix">Rs.</span>
                  <input
                    type="number"
                    placeholder="Max"
                    min={0}
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Star rating checkboxes */}
            <div className="filter-group">
              <div className="filter-group__title">Star rating</div>
              {STAR_OPTIONS.map(({ label, value }) => (
                <label key={value} className="filter-check">
                  <input
                    type="radio"
                    name="stars"
                    value={value}
                    checked={stars === value}
                    /*
                      Controlled radio: React state drives which option is selected.
                      onChange updates stars state; applyFilters pushes it to the URL.
                    */
                    onChange={() => setStars(value)}
                    style={{ accentColor: 'var(--action)' }}
                  />
                  <span className="filter-check__label">{label}</span>
                </label>
              ))}
              {stars && (
                <button
                  type="button"
                  onClick={() => setStars('')}
                  style={{ fontSize: '0.78rem', color: 'var(--action)', background: 'none', border: 'none', padding: '0.25rem 0', cursor: 'pointer', textAlign: 'left' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Amenities checkboxes */}
            <div className="filter-group">
              <div className="filter-group__title">Facilities</div>
              {AMENITY_OPTIONS.map((a, idx) => {
                const count = [18, 12, 9, 21, 14][idx] || 10
                return (
                  <label key={a} className="filter-check">
                    <input type="checkbox" />
                    <span className="filter-check__label">{a}</span>
                    <span className="filter-check__count">{count}</span>
                  </label>
                )
              })}
            </div>

            {/* Filter action buttons */}
            <div className="filter-actions">
              <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                style={{ fontSize: '0.85rem', border: '1.5px solid var(--border-dark)', background: '#fff', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                Reset
              </button>
            </div>
          </form>
        </aside>

        {/* ========== RIGHT: Results column ========== */}
        <div className="results-col">

          {/* Sort tabs */}
          <div className="results-toolbar">
            <span className="results-count">
              {!loading && `${hotels.length} results`}
            </span>
            <div className="sort-tabs">
              {[
                { label: 'Top picks',         value: 'rating' },
                { label: 'Price (low first)', value: 'price'  },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className={`sort-tab${sortBy === value ? ' sort-tab--active' : ''}`}
                  onClick={() => handleSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="state-box"><p>Searching for available properties...</p></div>
          )}

          {/* Error */}
          {error && (
            <div className="error-strip">{error}</div>
          )}

          {/* Empty state */}
          {!loading && !error && hotels.length === 0 && (
            <div className="state-box">
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>No properties match your search.</p>
              <p>Try a different city or clearing the filters.</p>
              <button className="btn-secondary" onClick={resetFilters} style={{ marginTop: '0.75rem' }}>
                Clear all filters
              </button>
            </div>
          )}

          {/* Results list — horizontal cards */}
          {!loading && !error && hotels.length > 0 && (
            <div className="results-list">
              {hotels.map(hotel => (
                /*
                  variant="horizontal" switches HotelCard to the wide Booking.com
                  layout: thumbnail | info | price+CTA
                */
                <HotelCard key={hotel.id} hotel={hotel} variant="horizontal" />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
