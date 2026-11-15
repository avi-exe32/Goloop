/*
  SignupPage.jsx — new user registration form.
*/
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

export default function SignupPage() {
  const { login }     = useAuth()
  const navigate      = useNavigate()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await authApi.signup({ name, email, password })
      // Signup returns a token immediately so the user is auto-logged in
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="auth-box__title">Create your account</h1>
        <p className="auth-box__sub">Start booking your perfect stay</p>

        {error && <div className="error-strip">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" required value={name}
              onChange={e => setName(e.target.value)} placeholder="Rahul Sharma" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={6} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <button type="submit" className="btn-primary auth-form__btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-box__footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
