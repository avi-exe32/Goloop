/*
  SearchPage.jsx — shows filtered and sorted hotel search results.

  KEY CONCEPTS:
  - useSearchParams: React Router hook to read/write URL query parameters
    (?city=Goa&min_price=2000). The URL IS the state for search — this means
    users can bookmark or share their search results.
  - Lifting search params from the URL means pressing browser Back
    brings you back to the exact same search, not a blank page.
*/

import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { hotelsApi } from '../api/client'
import HotelCard from '../components/HotelCard'
import './SearchPage.css'

export default function SearchPage() {
  /*
    useSearchParams gives us read/write access to ?key=value in the URL.
    searchParams.get('city') reads the value; setSearchParams updates the URL.
    When the URL changes, React Router re-renders this component, which
    triggers a new useEffect run and a fresh API call.
  */
  const [searchParams, setSearchParams] = useSearchParams()

  // ---- Filter form state — initialised from URL params ----
  // This way, if the user arrives from the home page search form,
  // the filter sidebar already reflects their chosen criteria.
  const [city,     setCity]     = useState(searchParams.get('city') || '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [minRating,setMinRating]= useState(searchParams.get('min_rating') || '')
  const [sortBy,   setSortBy]   = useState(searchParams.get('sort_by') || 'price')

  // ---- Results state ----
  const [hotels,  setHotels]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  /*
    This useEffect re-runs whenever the URL search params change.
    It converts the URL params into an API call, and stores the result.

    WHY depend on searchParams.toString()?
    useEffect tracks changes by comparing the dependency value.
    searchParams is an object — objects are never equal in JS even if their
    contents are the same (e.g. {} !== {}).
    .toString() gives a string we can compare correctly.
  */
  useEffect(() => {
    setLoading(true)
    setError(null)

    // Pull filter values from the URL (not from local state) so the API call
    // always matches what's in the URL bar
    const params = {
      city:       searchParams.get('city')       || '',
      min_price:  searchParams.get('min_price')  || '',
      max_price:  searchParams.get('max_price')  || '',
      min_rating: searchParams.get('min_rating') || '',
      sort_by:    searchParams.get('sort_by')    || 'price',
    }

    hotelsApi.search(params)
      .then(data => {
        setHotels(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [searchParams.toString()])  // Re-run when URL params change

  // Apply filters: push values into the URL — this triggers the useEffect above
  function applyFilters(e) {
    e.preventDefault()
    const next = {}
    if (city)      next.city       = city
    if (minPrice)  next.min_price  = minPrice
    if (maxPrice)  next.max_price  = maxPrice
    if (minRating) next.min_rating = minRating
    next.sort_by = sortBy
    setSearchParams(next)   // Updates the URL, triggers re-render + useEffect
  }

  function resetFilters() {
    setCity(''); setMinPrice(''); setMaxPrice(''); setMinRating(''); setSortBy('price')
    setSearchParams({})
  }

  // Sort order changed inline (no need to re-submit the form)
  function handleSortChange(e) {
    setSortBy(e.target.value)
    const next = Object.fromEntries(searchParams.entries())
    next.sort_by = e.target.value
    setSearchParams(next)
  }

  const cityLabel = searchParams.get('city')

  return (
    <div className="search-page container">

      <div className="search-page__header">
        <h1>
          {cityLabel ? `Hotels in ${cityLabel}` : 'All Hotels'}
        </h1>
        <p>
          {loading ? 'Searching...' : `${hotels.length} ${hotels.length === 1 ? 'property' : 'properties'} found`}
        </p>
      </div>

      <div className="search-page__layout">

        {/* ---- Left: Filters sidebar ---- */}
        <aside>
          <form className="filters" onSubmit={applyFilters}>
            <h2 className="filters__title">Filters</h2>

            <div className="filters__group">
              <label htmlFor="f-city">City</label>
              <input
                id="f-city"
                type="text"
                placeholder="Goa, Delhi..."
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>

            <div className="filters__group">
              <label>Price per night (Rs.)</label>
              <div className="filters__price-row">
                <input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="filters__group">
              <label htmlFor="f-rating">Min star rating</label>
              <select
                id="f-rating"
                value={minRating}
                onChange={e => setMinRating(e.target.value)}
              >
                <option value="">Any</option>
                <option value="3">3 and above</option>
                <option value="4">4 and above</option>
                <option value="4.5">4.5 and above</option>
              </select>
            </div>

            <button type="submit" className="filters__apply-btn">
              Apply Filters
            </button>
            <button type="button" className="filters__reset-btn" onClick={resetFilters}>
              Reset
            </button>
          </form>
        </aside>

        {/* ---- Right: Results ---- */}
        <div className="results">

          {/* Sort controls */}
          <div className="results__toolbar">
            <span className="results__count">
              {!loading && `${hotels.length} results`}
            </span>
            <div className="results__sort">
              <label htmlFor="sort-by">Sort by:</label>
              <select id="sort-by" value={sortBy} onChange={handleSortChange}>
                <option value="price">Price: Low to High</option>
                <option value="rating">Rating: High to Low</option>
              </select>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="state-box">
              <p>Searching for hotels...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="error-strip">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && hotels.length === 0 && (
            <div className="state-box">
              <p>No hotels match your search.</p>
              <p>Try a different city or clearing the filters.</p>
              <button className="btn-secondary" onClick={resetFilters} style={{ marginTop: '1rem' }}>
                Clear Filters
              </button>
            </div>
          )}

          {/* Results grid */}
          {!loading && !error && hotels.length > 0 && (
            <div className="results__grid">
              {hotels.map(hotel => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
