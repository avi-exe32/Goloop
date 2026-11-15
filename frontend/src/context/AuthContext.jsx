/*
  context/AuthContext.jsx — global authentication state.

  WHY React Context?
  The logged-in user's data (name, token, is_admin) is needed by the Navbar,
  the My Bookings page, the Booking form, and the Admin area — components that
  are spread all over the component tree. Passing the user down as a "prop"
  through every intermediate component would be messy (called "prop drilling").

  Context is React's built-in solution: you wrap your whole app in a Provider,
  and any component anywhere in the tree can read the value with useContext()
  without any props being passed down manually.
*/

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'

// Step 1: Create the context object. null is just the default before the
// Provider sets the real value — in practice the Provider always wraps the app.
const AuthContext = createContext(null)

// Step 2: The Provider component that wraps the whole app (see App.jsx).
// It owns the state and exposes login/logout functions.
export function AuthProvider({ children }) {
  // `user` holds the logged-in user object or null if not logged in
  const [user, setUser]       = useState(null)
  // `loading` prevents flashing "not logged in" UI while we check localStorage
  const [loading, setLoading] = useState(true)

  // On first render, check if a token is already saved from a previous session.
  // This is how "stay logged in" works — the token persists in localStorage.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Validate the token is still good by calling /auth/me
      authApi.me()
        .then(setUser)
        .catch(() => {
          // Token is expired or invalid — clear it
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // Empty array = run once when the component first mounts

  // Called after a successful login or signup API response
  function login(token, userData) {
    localStorage.setItem('token', token) // Persist the token
    setUser(userData)                     // Update React state -> re-renders UI
  }

  // Clear everything and go back to logged-out state
  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = {
    user,           // The user object (or null)
    isLoggedIn: !!user,          // Boolean shorthand
    isAdmin: user?.is_admin || false,
    login,
    logout,
    loading,        // True during the initial token check
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Step 3: A custom hook so components don't have to import AuthContext directly.
// Usage: const { user, login, logout } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
