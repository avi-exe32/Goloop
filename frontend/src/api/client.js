/*
  api/client.js — central place where ALL HTTP requests to the backend live.

  WHY centralise this?
  If the backend URL changes, or if you want to add a loading spinner or
  error logging to every request, you change it in ONE place here rather
  than hunting through 10 different component files.

  We use the native browser `fetch()` API (no extra library needed).
  Every function:
    1. Builds the URL (proxied through Vite to http://127.0.0.1:8000)
    2. Sends the request with the right headers
    3. Parses the JSON response
    4. Throws an error with the server's error message if the status is not 2xx
*/

const BASE = '/api'

// Helper: reads the JWT token from localStorage.
// localStorage persists even if the user closes and reopens the tab —
// that's why we use it for the auth token instead of a React state variable.
function getToken() {
  return localStorage.getItem('token')
}

// Helper: build the Authorization header when a token exists.
// FastAPI's OAuth2PasswordBearer expects "Bearer <token>" in this header.
function authHeader() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Core fetch wrapper — handles JSON parsing and error extraction
async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),             // Spread in auth header if logged in
      ...options.headers,          // Allow callers to override headers
    },
    ...options,
  })

  // Try to parse a JSON body regardless of success/failure
  // so we can return the server's error message to the user
  let data = null
  try {
    data = await response.json()
  } catch {
    // Some responses (like 204 No Content) have no body
  }

  if (!response.ok) {
    // FastAPI returns errors as { "detail": "..." }
    const message = data?.detail || `Request failed (${response.status})`
    const err = new Error(message)
    err.status = response.status
    throw err
  }

  return data
}

// Convenience wrappers for each HTTP verb
const get  = (path)         => request(path)
const post = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) })
const patch = (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) })
const del  = (path)         => request(path, { method: 'DELETE' })


// ---- Auth endpoints ----

export const authApi = {
  signup: (data) => post('/auth/signup', data),
  login:  (data) => post('/auth/login', data),
  me:     ()     => get('/auth/me'),
}


// ---- Hotel endpoints ----

export const hotelsApi = {
  // Build a query string from a plain object: { city: 'Goa', min_price: 2000 }
  // -> "?city=Goa&min_price=2000"
  search: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString()
    return get(`/hotels/search${qs ? '?' + qs : ''}`)
  },

  popular:   ()         => get('/hotels/popular'),
  getById:   (id)       => get(`/hotels/${id}`),
}


// ---- Booking endpoints ----

export const bookingsApi = {
  create:    (data)     => post('/bookings', data),
  myList:    ()         => get('/bookings/my'),
  cancel:    (id)       => patch(`/bookings/${id}/cancel`),
}


// ---- Admin endpoints ----

export const adminApi = {
  // Hotels
  createHotel: (data)       => post('/admin/hotels', data),
  updateHotel: (id, data)   => patch(`/admin/hotels/${id}`, data),
  deleteHotel: (id)         => del(`/admin/hotels/${id}`),

  // Rooms
  createRoom:  (hotelId, data) => post(`/admin/hotels/${hotelId}/rooms`, data),
  updateRoom:  (id, data)      => patch(`/admin/rooms/${id}`, data),
  deleteRoom:  (id)            => del(`/admin/rooms/${id}`),

  // Bookings
  allBookings: ()         => get('/admin/bookings'),
  cancelBooking: (id)     => patch(`/admin/bookings/${id}/cancel`),
}
