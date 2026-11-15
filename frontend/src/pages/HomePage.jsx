/*
  HomePage.jsx — the landing page shown at the root URL "/".

  Contains:
  1. Hero section with a search bar
  2. Popular destinations grid pulled from the backend

  KEY CONCEPTS used here:
  - useState: React's way to store values that change over time (like API data)
  - useEffect: runs code after the component renders — perfect for fetching data
  - useNavigate: React Router hook to programmatically change the URL
*/

import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { hotelsApi } from '../api/client'
import HotelCard from '../components/HotelCard'
import './HomePage.css'

export default function HomePage() {
  // ---- Search form state ----
  // Each piece of form data is a separate state variable.
  // When the user types, we call the setter (e.g. setCity) which
  // triggers a re-render showing the updated value in the input.
  const [city,     setCity]     = useState('')
  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests,   setGuests]   = useState(1)

  // ---- Popular destinations state ----
  const [popular,  setPopular]  = useState([])   // Array of hotel summaries
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // useNavigate lets us change the URL in code (without an <a> tag click)
  const navigate = useNavigate()

  // useEffect runs AFTER the component first renders.
  // The empty [] dependency array means "run this only once on mount" —
  // equivalent to componentDidMount in older class components.
  useEffect(() => {
    hotelsApi.popular()
      .then(data => {
        setPopular(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Called when the user submits the search form
  function handleSearch(e) {
    e.preventDefault()  // Prevent the browser's default form submission (page reload)

    // Build the URL query string from the form values.
    // useSearchParams on the SearchPage will read these.
    const params = new URLSearchParams()
    if (city)     params.set('city', city)
    if (checkIn)  params.set('check_in', checkIn)
    if (checkOut) params.set('check_out', checkOut)
    if (guests)   params.set('guests', guests)

    // Navigate to the search page — React Router updates the URL and
    // the SearchPage component reads the params and fires its own API call
    navigate(`/search?${params.toString()}`)
  }

  return (
    <div className="home-page">

      {/* ---- Hero Section ---- */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">Find your perfect stay across India</h1>
          <p className="hero__subtitle">
            From Himalayan retreats to beachside resorts — search, book, explore.
          </p>

          {/* Search bar form */}
          <form className="search-bar" onSubmit={handleSearch}>

            <div className="search-bar__field">
              <label htmlFor="city">Destination</label>
              {/*
                Controlled input: the value is always driven by React state.
                onChange fires on every keystroke and updates the state,
                which re-renders the input with the new value.
                This is called a "controlled component" pattern.
              */}
              <input
                id="city"
                type="text"
                placeholder="Goa, Jaipur, Manali..."
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>

            <div className="search-bar__field">
              <label htmlFor="check-in">Check-in</label>
              <input
                id="check-in"
                type="date"
                value={checkIn}
                min={new Date().toISOString().split('T')[0]}  /* Disallow past dates */
                onChange={e => setCheckIn(e.target.value)}
              />
            </div>

            <div className="search-bar__field">
              <label htmlFor="check-out">Check-out</label>
              <input
                id="check-out"
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split('T')[0]}
                onChange={e => setCheckOut(e.target.value)}
              />
            </div>

            <div className="search-bar__field">
              <label htmlFor="guests">Guests</label>
              <input
                id="guests"
                type="number"
                min={1}
                max={10}
                value={guests}
                onChange={e => setGuests(e.target.value)}
              />
            </div>

            <button type="submit" className="search-bar__btn">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ---- Popular Destinations Section ---- */}
      <section className="destinations container">
        <div className="section-header">
          <h2 className="section-title">Popular Destinations</h2>
          <Link to="/search" className="section-link">View all</Link>
        </div>

        {/* Conditional rendering: show different UI based on the current state */}
        {loading && (
          <div className="state-box">
            <p>Loading destinations...</p>
          </div>
        )}

        {error && (
          <div className="error-strip">
            Could not load destinations: {error}
          </div>
        )}

        {!loading && !error && popular.length === 0 && (
          <div className="state-box">
            <p>No destinations found.</p>
          </div>
        )}

        {!loading && !error && popular.length > 0 && (
          <div className="destinations__grid">
            {/*
              .map() transforms the array of hotel objects into an array of
              React elements. The `key` prop is required by React to efficiently
              update the DOM — it must be unique among siblings.
            */}
            {popular.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
