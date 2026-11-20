import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__brand">Goloop</span>
        <span className="footer__copy">
          {new Date().getFullYear()} Goloop Travel Pvt. Ltd. All rights reserved.
        </span>
        <div className="footer__links">
          <Link to="/">Home</Link>
          <Link to="/search">All hotels</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}
