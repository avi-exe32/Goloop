/*
  Footer.jsx — simple footer rendered on every page.
  Kept minimal; expand in Phase 7 if needed.
*/

import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__brand">Goloop</span>
        <span className="footer__copy">
          {year} Goloop Travel. All rights reserved.
        </span>
        <div className="footer__links">
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
        </div>
      </div>
    </footer>
  )
}
