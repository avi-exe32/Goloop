/*
  LoginPage.jsx — email + password login.

  Extra behaviour added in Phase 4:
  - If the user is already logged in, redirect to home immediately.
  - After login, go back to wherever they came from (or home).
    This handles the case: user clicks "Book" -> redirected to login -> after
    login, they should land back on the hotel page, not the home page.
*/
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth()
  const navigate  = useNavigate()
  /*
    useLocation gives the current URL, including the `state` object that
    React Router lets you attach when navigating programmatically.
    We use state.from to remember where the user was before being redirected
    to login, so we can send them back after a successful sign-in.
  */
  const location  = useLocation()
  const from      = location.state?.from || '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  /* Redirect away if already authenticated */
  useEffect(() => {
    if (isLoggedIn) navigate(from, { replace: true })
  }, [isLoggedIn])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      /*
        login() stores the JWT in localStorage and updates AuthContext.
        Every component that calls useAuth() will re-render with the new
        logged-in state — including the Navbar which switches to "Sign out".
      */
      login(data.access_token, data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="auth-box__title">Sign in</h1>
        <p className="auth-box__sub">Access your bookings and exclusive deals</p>

        {error && <div className="error-strip">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary auth-form__btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Demo: <strong>demo@travel.local</strong> / <strong>demo123</strong>
        </p>

        <p className="auth-box__footer">
          New to Goloop? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
