/*
  AdminRoomsPage.jsx — Room inventory and rate management.

  Allows an admin to:
  1. Pick any hotel from a selector dropdown (or via ?hotel_id query parameter).
  2. View all room types defined for that property with capacity, units, and rates.
  3. Add new room types with pricing and total units.
  4. Edit existing room rates or capacities.
  5. Delete rooms (which automatically updates the hotel's cached minimum price).
*/

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hotelsApi, adminApi } from '../api/client'

/* ---- Inline SVG icons (no emoji) ---- */
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const EMPTY_ROOM_FORM = {
  room_type: '',
  description: '',
  price_per_night: 3500,
  capacity: 2,
  total_rooms: 5,
}

export default function AdminRoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialHotelId = searchParams.get('hotel_id') || ''

  const [hotelsList, setHotelsList] = useState([])
  const [selectedHotelId, setSelectedHotelId] = useState(initialHotelId)
  const [hotelDetail, setHotelDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null)
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_ROOM_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Load all hotels once for the selection dropdown
  useEffect(() => {
    hotelsApi.search({})
      .then((data) => {
        setHotelsList(data)
        // If no hotel was preselected, pick the first one automatically
        if (!selectedHotelId && data.length > 0) {
          setSelectedHotelId(String(data[0].id))
        }
      })
      .catch((err) => setError(err.message || 'Failed to fetch hotel list.'))
  }, [])

  // Whenever selectedHotelId changes, fetch the rooms for that hotel
  useEffect(() => {
    if (!selectedHotelId) return
    loadRooms(selectedHotelId)
    // Keep URL parameter in sync
    setSearchParams({ hotel_id: selectedHotelId })
  }, [selectedHotelId])

  async function loadRooms(hotelId) {
    setLoading(true)
    setError(null)
    try {
      const data = await hotelsApi.getById(hotelId)
      setHotelDetail(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch room types.')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setFormData(EMPTY_ROOM_FORM)
    setFormError(null)
    setActiveRoomId(null)
    setModalMode('add')
  }

  function openEditModal(room) {
    setFormError(null)
    setActiveRoomId(room.id)
    setFormData({
      room_type: room.room_type,
      description: room.description || '',
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      total_rooms: room.total_rooms,
    })
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode(null)
    setActiveRoomId(null)
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const payload = {
        room_type: formData.room_type.trim(),
        description: formData.description.trim(),
        price_per_night: parseFloat(formData.price_per_night),
        capacity: parseInt(formData.capacity, 10),
        total_rooms: parseInt(formData.total_rooms, 10),
      }

      if (modalMode === 'add') {
        await adminApi.createRoom(selectedHotelId, payload)
      } else {
        await adminApi.updateRoom(activeRoomId, payload)
      }

      closeModal()
      await loadRooms(selectedHotelId)
    } catch (err) {
      setFormError(err.message || 'Error saving room.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await adminApi.deleteRoom(deleteTarget.id)
      setDeleteTarget(null)
      await loadRooms(selectedHotelId)
    } catch (err) {
      alert(`Could not delete room: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-section-title">Rooms & Rates Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Configure room types, guest capacities, inventory limits, and nightly rates
          </p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={openAddModal}
          disabled={!selectedHotelId}
        >
          <IconPlus /> Add Room Type
        </button>
      </div>

      {/* ---- Hotel Selector Bar ---- */}
      <div
        style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          Selected Hotel:
        </label>
        <select
          className="admin-form-select"
          style={{ maxWidth: '360px', padding: '8px 12px' }}
          value={selectedHotelId}
          onChange={(e) => setSelectedHotelId(e.target.value)}
        >
          {hotelsList.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.city})
            </option>
          ))}
        </select>

        {hotelDetail && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            Location: <strong>{hotelDetail.city}</strong> | Star rating: <strong>{hotelDetail.star_rating}</strong>
          </span>
        )}
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading rooms for selected property...</div>
      ) : !hotelDetail || hotelDetail.rooms.length === 0 ? (
        <div className="admin-empty">
          No room types configured for this hotel yet. Click "Add Room Type" above to add one.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Room Type</th>
                <th>Capacity</th>
                <th>Inventory Units</th>
                <th>Rate / Night</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotelDetail.rooms.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{r.id}</td>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>{r.room_type}</strong>
                    {r.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td>{r.capacity} {r.capacity === 1 ? 'Guest' : 'Guests'}</td>
                  <td>
                    <strong>{r.total_rooms}</strong> total {r.total_rooms === 1 ? 'unit' : 'units'}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--action)' }}>
                      Rs. {Math.round(r.price_per_night).toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        onClick={() => openEditModal(r)}
                        title="Edit room"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => setDeleteTarget(r)}
                        title="Delete room"
                      >
                        <IconTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Add / Edit Room Modal ---- */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">
                {modalMode === 'add' ? 'Add Room Type' : 'Edit Room Configuration'}
              </h2>
              <button className="admin-modal__close" onClick={closeModal} aria-label="Close">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal__body">
              {formError && <div className="admin-error">{formError}</div>}

              <div className="admin-form-group">
                <label className="admin-form-label">Room Type *</label>
                <input
                  type="text"
                  required
                  className="admin-form-input"
                  placeholder="e.g. Deluxe Sea View King Room"
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea
                  className="admin-form-textarea"
                  placeholder="e.g. 1 King Bed, Private Balcony, Ensuite Marble Bathroom"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Price / Night (INR) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="admin-form-input"
                    value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Max Guest Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    className="admin-form-input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Total Room Units in Property *</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  className="admin-form-input"
                  value={formData.total_rooms}
                  onChange={(e) => setFormData({ ...formData, total_rooms: e.target.value })}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  The booking engine checks this inventory limit to prevent double-booking.
                </span>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Room' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Room Confirmation Modal ---- */}
      {deleteTarget && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">Confirm Room Deletion</h2>
              <button
                className="admin-modal__close"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
                Are you sure you want to remove <strong>{deleteTarget.room_type}</strong> from this property?
              </p>
              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={confirmDelete}
                >
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
