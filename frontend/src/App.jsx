/*
  App.jsx — the root component of the entire frontend.

  This file does three things:
  1. Wraps the app in AuthProvider so every component can read login state
  2. Sets up React Router so the browser URL controls which page renders
  3. Defines all the routes (URL patterns → page components)

  HOW ROUTING WORKS:
  React Router listens to the browser URL. When the user clicks a <Link>
  or types a URL, React Router swaps out just the page component — the
  Navbar and Footer stay in place. No full page reload happens, which is
  what makes this a "Single Page Application".
*/

import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

import Navbar    from './components/Navbar'
import Footer    from './components/Footer'
import HomePage        from './pages/HomePage'
import SearchPage      from './pages/SearchPage'
import HotelDetailPage from './pages/HotelDetailPage'
import LoginPage       from './pages/LoginPage'
import SignupPage      from './pages/SignupPage'
import MyBookingsPage  from './pages/MyBookingsPage'
import AdminPage       from './pages/AdminPage'
import NotFoundPage    from './pages/NotFoundPage'

export default function App() {
  return (
    // AuthProvider gives every child component access to login state
    <AuthProvider>
      {/*
        BrowserRouter uses the HTML5 History API so URLs look like
        /hotels/5 instead of /#/hotels/5. The server must be configured
        to serve index.html for all routes — Vite handles this in dev mode.
      */}
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />

          {/*
            <main> gets top padding so content doesn't hide behind the fixed navbar.
            Routes renders only the first <Route> whose path matches the current URL.
          */}
          <main className="app-main">
            <Routes>
              <Route path="/"               element={<HomePage />} />
              <Route path="/search"         element={<SearchPage />} />
              <Route path="/hotels/:id"     element={<HotelDetailPage />} />
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/signup"         element={<SignupPage />} />
              <Route path="/my-bookings"    element={<MyBookingsPage />} />
              <Route path="/admin/*"        element={<AdminPage />} />
              {/* Catch-all: any URL that didn't match above shows the 404 page */}
              <Route path="*"              element={<NotFoundPage />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
