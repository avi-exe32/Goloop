/*
  Navbar.jsx — the persistent top navigation bar.

  Uses:
  - useAuth() to know if the user is logged in and show the right links
  - NavLink from React Router — same as <Link> but adds an "active" class
    automatically when the current URL matches the link's path
  - useState for the mobile menu open/close toggle
*/

import React, { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { isLoggedIn, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  // Controls whether the mobile dropdown menu is visible
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    setMenuOpen(false)
    // Redirect to home after logout so user doesn't see a protected page
    navigate('/')
  }

  // Helper: returns the CSS class for a NavLink.
  // React Router passes { isActive } so we can style the current page link differently.
  const linkClass = ({ isActive }) =>
    'navbar__link' + (isActive ? ' navbar__link--active' : '')

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">

        {/* Logo — always visible, links to home */}
        <Link to="/" className="navbar__logo">
          Goloop
        </Link>

        {/*
          Hamburger button — only visible on mobile (CSS hides it on desktop).
          Toggles the mobile menu open/closed.
        */}
        <button
          className="navbar__toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Navigation links — hidden on mobile until hamburger is tapped */}
        <div className={`navbar__links${menuOpen ? ' navbar__links--open' : ''}`}>

          <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>

          {/* Only logged-in users see My Bookings */}
          {isLoggedIn && (
            <NavLink to="/my-bookings" className={linkClass} onClick={() => setMenuOpen(false)}>
              My Bookings
            </NavLink>
          )}

          {/* Admin link — only for admin users */}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass} onClick={() => setMenuOpen(false)}>
              Admin
            </NavLink>
          )}

          {isLoggedIn ? (
            /* Logged-in state: show Logout button */
            <button
              className="navbar__link navbar__link--btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            /* Logged-out state: show Login link */
            <NavLink
              to="/login"
              className="navbar__link navbar__link--btn"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
