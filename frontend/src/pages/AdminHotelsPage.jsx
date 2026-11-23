/*
  AdminHotelsPage.jsx — Hotel inventory management for administrators.

  Allows an admin to:
  1. View all hotels in a dense, sorted table.
  2. Create a new hotel via a modal dialog.
  3. Edit existing hotel details (name, city, address, description, star rating, amenities).
  4. Delete a hotel with confirmation.
  5. Deep-link directly to manage rooms for any specific hotel.

  WHY optimistic / local refresh?
  After creating, updating, or deleting a hotel, we re-fetch the list
  from the backend to guarantee the displayed list matches the SQLite state.
*/

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hotelsApi, adminApi } from '../api/client'

/* ---- Inline SVGs (No emojis allowed) ---- */
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

const IconDoor = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"/>
    <circle cx="15" cy="12" r="1"/>
  </svg>
)

const EMPTY_HOTEL_FORM = {
  name: '',
  city: '',
  address: '',
  description: '',
  star_rating: 4.0,
  amenities: 'Free WiFi, Air conditioning, Restaurant',
}

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null)
  const [activeHotelId, setActiveHotelId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_HOTEL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    loadHotels()
  }, [])

  async function loadHotels() {
    setLoading(true)
    setError(null)
    try {
      // Empty params returns all hotels from the backend
      const data = await hotelsApi.search({})
      setHotels(data)
    } catch (err) {
      setError(err.message || 'Failed to load hotels.')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setFormData(EMPTY_HOTEL_FORM)
    setFormError(null)
    setActiveHotelId(null)
    setModalMode('add')
  }

  async function openEditModal(hotel) {
    setFormError(null)
    setActiveHotelId(hotel.id)
    setModalMode('edit')
    setSubmitting(true)
    try {
      // Fetch full hotel record to get address and description which are not in the summary
      const full = await hotelsApi.getById(hotel.id)
      setFormData({
        name: full.name || '',
        city: full.city || '',
        address: full.address || '',
        description: full.description || '',
        star_rating: full.star_rating || 4.0,
        amenities: full.amenities || '',
      })
    } catch {
      // Fallback to whatever summary data we already have
      setFormData({
        name: hotel.name,
        city: hotel.city,
        address: '',
        description: '',
        star_rating: hotel.star_rating,
        amenities: '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    setModalMode(null)
    setActiveHotelId(null)
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        star_rating: parseFloat(formData.star_rating),
        amenities: formData.amenities.trim(),
      }

      if (modalMode === 'add') {
        await adminApi.createHotel(payload)
      } else {
        await adminApi.updateHotel(activeHotelId, payload)
      }

      closeModal()
      await loadHotels()
    } catch (err) {
      setFormError(err.message || 'Error saving hotel.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await adminApi.deleteHotel(deleteTarget.id)
      setDeleteTarget(null)
      await loadHotels()
    } catch (err) {
      alert(`Could not delete hotel: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-section-title">Hotels Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            {hotels.length} properties registered in the system
          </p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={openAddModal}>
          <IconPlus /> Add Hotel
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading properties...</div>
      ) : hotels.length === 0 ? (
        <div className="admin-empty">No hotels found. Click "Add Hotel" to create one.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Hotel Name</th>
                <th>City</th>
                <th>Star Rating</th>
                <th>Starting Price</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{h.id}</td>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>{h.name}</strong>
                  </td>
                  <td>{h.city}</td>
                  <td>
                    <span className="admin-stars">
                      {h.star_rating?.toFixed(1)} / 5.0
                    </span>
                  </td>
                  <td>
                    {h.price_per_night_min > 0
                      ? `Rs. ${Math.round(h.price_per_night_min).toLocaleString('en-IN')} / night`
                      : 'No rooms added'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <Link
                        to={`/admin/rooms?hotel_id=${h.id}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title="Manage rooms for this hotel"
                      >
                        <IconDoor /> Rooms
                      </Link>
                      <button
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        onClick={() => openEditModal(h)}
                        title="Edit hotel details"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => setDeleteTarget(h)}
                        title="Delete hotel"
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

      {/* ---- Add / Edit Hotel Modal ---- */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">
                {modalMode === 'add' ? 'Add New Hotel' : 'Edit Hotel Details'}
              </h2>
              <button className="admin-modal__close" onClick={closeModal} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal__body">
              {formError && <div className="admin-error">{formError}</div>}

              <div className="admin-form-group">
                <label className="admin-form-label">Hotel Name *</label>
                <input
                  type="text"
                  required
                  className="admin-form-input"
                  placeholder="e.g. Royal Palace Heritage"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">City *</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Jaipur"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Star Rating (1.0 - 5.0) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    className="admin-form-input"
                    value={formData.star_rating}
                    onChange={(e) => setFormData({ ...formData, star_rating: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Address *</label>
                <input
                  type="text"
                  required
                  className="admin-form-input"
                  placeholder="e.g. 14 Palace Road, Civil Lines"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Description *</label>
                <textarea
                  required
                  className="admin-form-textarea"
                  placeholder="Provide an enticing summary for potential guests..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Amenities (comma-separated)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Free WiFi, Swimming Pool, Spa, Airport Shuttle"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                />
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
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Hotel' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteTarget && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">Confirm Hotel Deletion</h2>
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
                Are you sure you want to permanently delete{' '}
                <strong>{deleteTarget.name}</strong> ({deleteTarget.city})?
              </p>
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '20px' }}>
                This will also delete associated rooms and cannot be undone.
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
                  Delete Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
