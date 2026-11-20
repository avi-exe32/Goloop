/*
  Navbar.jsx — two-row navy navigation bar.

  Row 1: brand logo | currency/language labels | auth buttons
  Row 2: sub-navigation tabs with SVG icons

  WHY two rows?
  Dense travel sites separate branding/account actions (top) from
  product category navigation (bottom) so both can grow independently
  without cluttering each other.
*/

import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

/* ---- Inline SVG icons — no emoji, no icon library dependency ---- */
/* Each SVG is a tiny pure function returning JSX so it can be used inline */
const IconBed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><line x1="12" y1="10" x2="12" y2="20"/>
  </svg>
)

const IconPlane = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.6 1.7l3 3 2.5-.5L4 14l1 1 3.5-2.5-.5 2.5 3 3a1 1 0 0 0 1.7-.6z"/>
  </svg>
)

const IconCar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 17H5v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2H1v-5l3-6h14l3 6v5h-1v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>
  </svg>
)

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const SUB_TABS = [
  { label: 'Stays',       Icon: IconBed,   href: '/'       },
  { label: 'Flights',     Icon: IconPlane, href: '#'       },
  { label: 'Car rental',  Icon: IconCar,   href: '#'       },
  { label: 'Attractions', Icon: IconMap,   href: '#'       },
]

export default function Navbar() {
  const { isLoggedIn, isAdmin, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      {/* ---- Row 1: Main navbar ---- */}
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* Brand logo */}
          <Link to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
            Goloop
          </Link>

          {/* Mobile hamburger — only visible on small screens via CSS */}
          <button
            className="navbar__toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>

          {/* Right-side actions — hidden on mobile until hamburger opens */}
          <div className={`navbar__actions${menuOpen ? ' navbar__actions--open' : ''}`}>

            {/* Currency indicator (display only) */}
            <div className="navbar__ghost-btn hide-mobile">
              <IconGlobe />
              INR
            </div>

            {/* Language indicator (display only) */}
            <div className="navbar__ghost-btn hide-mobile">EN</div>

            {isLoggedIn ? (
              <>
                {/* Show the user's first name */}
                <span className="navbar__user hide-mobile">
                  {user?.name?.split(' ')[0]}
                </span>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="navbar__auth-btn"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}

                <Link
                  to="/my-bookings"
                  className="navbar__auth-btn"
                  onClick={() => setMenuOpen(false)}
                >
                  My bookings
                </Link>

                <button
                  className="navbar__auth-btn navbar__auth-btn--logout"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="navbar__auth-btn"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="navbar__auth-btn"
                  style={{ background: 'rgba(255,255,255,0.18)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ---- Row 2: Sub-navigation tabs ---- */}
      <div className="subnav" aria-label="Category navigation">
        <div className="subnav__inner">
          {SUB_TABS.map(({ label, Icon, href }) => {
            /*
              We want "Stays" to be active only on the home/search pages.
              NavLink handles this with the isActive callback.
            */
            const isActive = href === '/' && (
              window.location.pathname === '/' ||
              window.location.pathname === '/search'
            )
            return href === '#' ? (
              /* Disabled tabs for future phases */
              <span key={label} className="subnav__tab">
                <Icon />{label}
              </span>
            ) : (
              <NavLink
                key={label}
                to={href}
                end
                className={({ isActive: a }) =>
                  'subnav__tab' + (a || isActive ? ' subnav__tab--active' : '')
                }
              >
                <Icon />{label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </>
  )
}
