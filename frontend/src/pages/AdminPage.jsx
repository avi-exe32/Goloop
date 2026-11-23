/*
  AdminPage.jsx — the top-level admin section.

  HOW ADMIN ROUTING WORKS:
  Rather than a separate <Router>, we use a single parent route (/admin)
  with nested React Router sub-routes:
    /admin          -> AdminHotelsPage (default tab)
    /admin/rooms    -> AdminRoomsPage
    /admin/bookings -> AdminBookingsPage

  WHY a layout component?
  Every admin sub-page shares the same sidebar + header. By pulling that
  out into a layout (AdminLayout), each sub-page renders only its own
  table/form — the shell stays mounted and doesn't flicker on navigation.

  WHY admin guard here?
  We check isAdmin at this top level so every nested route is automatically
  protected. A non-admin who hits /admin/bookings directly gets redirected
  to the home page without seeing any admin UI.
*/

import React from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminHotelsPage   from './AdminHotelsPage'
import AdminRoomsPage    from './AdminRoomsPage'
import AdminBookingsPage from './AdminBookingsPage'
import './AdminPage.css'

/* ---- SVG Icons (no emoji) ---- */
const IconHotel = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const IconDoor = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"/>
    <circle cx="15" cy="12" r="1"/>
  </svg>
)

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)


export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth()

  // Wait for the auth check to finish before making any redirect decision.
  // Without this guard, the page would flash a redirect on first load
  // before the JWT has been verified.
  if (isLoading) {
    return <div className="admin-loading">Checking permissions...</div>
  }

  // Hard redirect — non-admins never see the admin shell at all
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="admin-layout">

      {/* ---- Admin sidebar ---- */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">Admin Panel</div>
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">

          {/* NavLink automatically adds the "active" class when the route matches */}
          <NavLink
            to="/admin"
            end                           /* "end" means only active on exact /admin, not /admin/* */
            className={({ isActive }) =>
              'admin-sidebar__link' + (isActive ? ' admin-sidebar__link--active' : '')
            }
          >
            <IconHotel /> Hotels
          </NavLink>

          <NavLink
            to="/admin/rooms"
            className={({ isActive }) =>
              'admin-sidebar__link' + (isActive ? ' admin-sidebar__link--active' : '')
            }
          >
            <IconDoor /> Rooms
          </NavLink>

          <NavLink
            to="/admin/bookings"
            className={({ isActive }) =>
              'admin-sidebar__link' + (isActive ? ' admin-sidebar__link--active' : '')
            }
          >
            <IconCalendar /> All Bookings
          </NavLink>
        </nav>
      </aside>

      {/* ---- Main content area — changes based on the current sub-route ---- */}
      <main className="admin-main">
        <Routes>
          {/*
            index route: /admin renders the hotels management page by default.
            "index" means this route matches when the parent path is an exact match.
          */}
          <Route index element={<AdminHotelsPage />} />
          <Route path="rooms"    element={<AdminRoomsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
        </Routes>
      </main>

    </div>
  )
}
