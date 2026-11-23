/*
  AdminBookingsPage.jsx — System-wide reservation monitoring and administrative cancellations.

  Provides full visibility into:
  1. All customer bookings across all hotels and dates.
  2. Filter tabs for quick triage: All | Confirmed | Cancelled.
  3. Search filtering by guest name, email, booking reference, or hotel.
  4. Administrative cancellation with immediate inventory release.
*/

import React, { useState, useEffect } from 'react'
import { adminApi } from '../api/client'

/* ---- Inline SVGs (No emojis allowed) ---- */
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'confirmed' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState('')

  // Cancel target modal
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.allBookings()
      setBookings(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch bookings list.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const updated = await adminApi.cancelBooking(cancelTarget.id)
      // Update in local state so the table updates immediately
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, status: 'cancelled' } : b))
      )
      setCancelTarget(null)
    } catch (err) {
      alert(`Could not cancel booking: ${err.message}`)
    } finally {
      setCancelling(false)
    }
  }

  // Filter pipeline
  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (statusFilter !== 'all' && b.status !== statusFilter) return false

    // Search filter
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      String(b.id).includes(term) ||
      (b.guest_name && b.guest_name.toLowerCase().includes(term)) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(term)) ||
      (b.hotel_name && b.hotel_name.toLowerCase().includes(term)) ||
      (b.city && b.city.toLowerCase().includes(term))
    )
  })

  // Metrics
  const totalCount = bookings.length
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0)

  return (
    <div>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-section-title">All Bookings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            System-wide reservation ledger across all properties
          </p>
        </div>
      </div>

      {/* ---- Metrics Summary Cards ---- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#f8f9fa', padding: '14px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Bookings
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div style={{ background: '#e6f4e6', padding: '14px 18px', borderRadius: 'var(--radius)', border: '1px solid rgba(0,128,9,0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirmed
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>
            {confirmedCount}
          </div>
        </div>

        <div style={{ background: '#fdecea', padding: '14px 18px', borderRadius: 'var(--radius)', border: '1px solid rgba(212,17,30,0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cancelled
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}>
            {cancelledCount}
          </div>
        </div>

        <div style={{ background: '#ebf3fb', padding: '14px 18px', borderRadius: 'var(--radius)', border: '1px solid rgba(0,113,194,0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--action)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gross Revenue
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--action)', marginTop: '4px' }}>
            Rs. {Math.round(totalRevenue).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* ---- Search & Filter Controls ---- */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        {/* Status filter tabs */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {['all', 'confirmed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '7px 14px',
                fontSize: '0.85rem',
                border: 'none',
                background: statusFilter === tab ? 'var(--action)' : '#fff',
                color: statusFilter === tab ? '#fff' : 'var(--text-secondary)',
                fontWeight: statusFilter === tab ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <IconSearch />
          </span>
          <input
            type="text"
            className="admin-form-input"
            style={{ paddingLeft: '32px', fontSize: '0.85rem', padding: '7px 10px 7px 32px' }}
            placeholder="Search guest, hotel, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading bookings...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="admin-empty">No bookings found matching your search filters.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Guest</th>
                <th>Hotel & Room</th>
                <th>Stay Dates</th>
                <th>Total Price</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{b.id}</td>
                  <td>
                    <strong>{b.guest_name || 'Guest User'}</strong>
                    {b.guest_email && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {b.guest_email}
                      </div>
                    )}
                    {b.guest_phone && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {b.guest_phone}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>{b.hotel_name || `Hotel #${b.hotel_id}`}</strong>
                    {b.city && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> ({b.city})</span>}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {b.room_type || `Room #${b.room_id}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.88rem' }}>
                      {b.check_in} &rarr; {b.check_out}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {b.guests} {b.guests === 1 ? 'Guest' : 'Guests'}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--action)' }}>
                      Rs. {Math.round(b.total_price).toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge badge--${b.status}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {b.status === 'confirmed' ? (
                      <button
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => setCancelTarget(b)}
                        title="Cancel this booking"
                      >
                        <IconX /> Cancel
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Cancel Confirmation Modal ---- */}
      {cancelTarget && (
        <div className="admin-modal-backdrop" onClick={() => setCancelTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">Cancel Booking #{cancelTarget.id}</h2>
              <button
                className="admin-modal__close"
                onClick={() => setCancelTarget(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              <p style={{ marginBottom: '14px', lineHeight: '1.6' }}>
                Are you sure you want to cancel the reservation for{' '}
                <strong>{cancelTarget.guest_name || 'this guest'}</strong> at{' '}
                <strong>{cancelTarget.hotel_name || 'the hotel'}</strong>?
              </p>
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '20px' }}>
                This will release the reserved room inventory immediately back to the pool.
              </p>
              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
