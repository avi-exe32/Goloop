/*
  NotFoundPage.jsx — shown for any URL that doesn't match a route.
*/
import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="state-box container" style={{ minHeight: '60vh' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent)' }}>404</h1>
      <p style={{ fontSize: '1.1rem' }}>This page does not exist.</p>
      <Link to="/" className="btn-primary" style={{ marginTop: '1rem' }}>
        Back to Home
      </Link>
    </div>
  )
}
