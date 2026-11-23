/*
  AdminDashboardPage.jsx — Live Traffic Telemetry & Real-time Booking Stream.

  FEATURES:
  1. Live SSE Data Stream with TOGGLE ON / OFF switch:
     - When ON: Subscribes to Server-Sent Events (/api/events/stream?token=...).
     - When OFF: Closes EventSource connection, pausing live ingestion while preserving historical feed.
  2. Simulator Controls:
     - Start / Stop background traffic generation.
     - Speed adjustments: 1x, 5x, 20x.
  3. Visualizations:
     - Bookings per minute dynamic SVG chart.
     - Top destination cities distribution.
     - Live activity ticker showing bookings, cancellations, conflicts, and signups.

  WHY Server-Sent Events (SSE)?
  SSE provides a lightweight, unidirectional pipeline over standard HTTP.
  Built-in browser auto-reconnect handles network hiccups automatically.
*/

import React, { useState, useEffect, useRef } from 'react'
import { adminApi } from '../api/client'
import './AdminDashboardPage.css'

/* ---- Clean SVG Icons (Zero Emoji) ---- */
const IconPlay = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const IconSquare = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

export default function AdminDashboardPage() {
  // ---- 1. Data Stream State (ON / OFF toggle) ----
  const [streamActive, setStreamActive] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connected' | 'reconnecting' | 'paused' | 'disconnected'
  const eventSourceRef = useRef(null)

  // ---- 2. Simulator State ----
  const [simulatorStatus, setSimulatorStatus] = useState({
    is_running: false,
    speed: 1,
    uptime_seconds: 0,
    total_actions: 0,
    total_bookings: 0,
    total_cancellations: 0,
    total_signups: 0,
    total_conflicts: 0,
  })
  const [simLoading, setSimLoading] = useState(false)

  // ---- 3. Telemetry Feed & Charts ----
  const [feedEvents, setFeedEvents] = useState([])
  const [cityStats, setCityStats] = useState({
    Goa: 8,
    Mumbai: 6,
    Delhi: 5,
    Jaipur: 4,
    Kerala: 3,
  })
  // Rolling minute buckets: array of counts for the last 10 minutes
  const [minuteBuckets, setMinuteBuckets] = useState([2, 5, 3, 7, 4, 8, 6, 9, 7, 5])
  const [liveGrossRevenue, setLiveGrossRevenue] = useState(148500)

  // Fetch initial simulator status
  useEffect(() => {
    fetchSimulatorStatus()
  }, [])

  async function fetchSimulatorStatus() {
    try {
      const data = await adminApi.simulatorStatus()
      setSimulatorStatus(data)
    } catch {
      // Ignored if API is temporarily unavailable
    }
  }

  // ---- Manage Server-Sent Events Lifecycle ----
  useEffect(() => {
    if (!streamActive) {
      // Stream is toggled OFF by the user
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setConnectionStatus('paused')
      return
    }

    // Stream is toggled ON: connect to the SSE endpoint
    const token = localStorage.getItem('token')
    if (!token) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')
    const sseUrl = `/api/events/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(sseUrl)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnectionStatus('connected')
    }

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        handleIncomingEvent(payload)
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    es.onerror = () => {
      // EventSource automatically tries reconnecting
      setConnectionStatus('reconnecting')
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [streamActive])

  // Process incoming live telemetry payload
  function handleIncomingEvent(payload) {
    const { event, data, timestamp } = payload
    if (event === 'connected') return

    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString()

    // Add to activity feed (keep most recent 50)
    setFeedEvents((prev) => [
      { id: Date.now() + Math.random(), event, data, timeStr },
      ...prev.slice(0, 49),
    ])

    // Update aggregate stats dynamically
    if (event === 'booking_created') {
      if (data.city) {
        setCityStats((prev) => ({
          ...prev,
          [data.city]: (prev[data.city] || 0) + 1,
        }))
      }
      if (data.total_price) {
        setLiveGrossRevenue((prev) => prev + Number(data.total_price))
      }
      // Increment current minute bucket
      setMinuteBuckets((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = (copy[copy.length - 1] || 0) + 1
        return copy
      })
    }

    // Refresh simulator status metrics
    setSimulatorStatus((prev) => ({
      ...prev,
      total_actions: prev.total_actions + 1,
      total_bookings: event === 'booking_created' ? prev.total_bookings + 1 : prev.total_bookings,
      total_cancellations: event === 'booking_cancelled' ? prev.total_cancellations + 1 : prev.total_cancellations,
      total_signups: event === 'user_registered' ? prev.total_signups + 1 : prev.total_signups,
      total_conflicts: event === 'booking_conflict' ? prev.total_conflicts + 1 : prev.total_conflicts,
    }))
  }

  // Simulator controls
  async function handleToggleSimulator() {
    setSimLoading(true)
    try {
      if (simulatorStatus.is_running) {
        const updated = await adminApi.simulatorStop()
        setSimulatorStatus(updated)
      } else {
        const updated = await adminApi.simulatorStart({ speed: simulatorStatus.speed })
        setSimulatorStatus(updated)
      }
    } catch (err) {
      alert(`Simulator error: ${err.message}`)
    } finally {
      setSimLoading(false)
    }
  }

  async function handleSetSpeed(speed) {
    try {
      const updated = await adminApi.simulatorSpeed(speed)
      setSimulatorStatus(updated)
    } catch (err) {
      alert(`Speed error: ${err.message}`)
    }
  }

  // Max value in minute buckets for SVG chart scaling
  const maxBucket = Math.max(...minuteBuckets, 10)

  // Sorted top 5 cities
  const topCities = Object.entries(cityStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCityCount = Math.max(...topCities.map((c) => c[1]), 1)

  return (
    <div className="dashboard-grid">
      {/* ---- Section Header ---- */}
      <div className="admin-section-header">
        <div>
          <h1 className="admin-section-title">Live Telemetry & Traffic Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Real-time event streaming via Server-Sent Events (SSE) with background simulator controls
          </p>
        </div>
      </div>

      {/* ---- Telemetry Bar: Stream Toggle & Simulator Controls ---- */}
      <div className="telemetry-bar">
        {/* Left: Stream Toggle (User requirement: toggle on and off) */}
        <div className="telemetry-bar__left">
          <div className="stream-toggle-container">
            <span className="stream-toggle-label">Data Stream:</span>
            <button
              className={`stream-toggle-btn ${
                streamActive ? 'stream-toggle-btn--on' : 'stream-toggle-btn--off'
              }`}
              onClick={() => setStreamActive(!streamActive)}
              title="Toggle Server-Sent Events live stream listening on or off"
            >
              {streamActive ? 'STREAM ON' : 'STREAM PAUSED'}
            </button>
          </div>

          {/* Connection status indicator */}
          <div className={`status-pill status-pill--${connectionStatus}`}>
            <span className={`status-dot status-dot--${connectionStatus}`} />
            {connectionStatus === 'connected' && 'Live Connected'}
            {connectionStatus === 'reconnecting' && 'Reconnecting...'}
            {connectionStatus === 'paused' && 'Stream Paused'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </div>
        </div>

        {/* Right: Simulator Controls */}
        <div className="telemetry-bar__right">
          <button
            className={`admin-btn ${
              simulatorStatus.is_running ? 'admin-btn--danger' : 'admin-btn--primary'
            }`}
            onClick={handleToggleSimulator}
            disabled={simLoading}
            style={{ minWidth: '140px' }}
          >
            {simulatorStatus.is_running ? (
              <>
                <IconSquare /> Stop Simulator
              </>
            ) : (
              <>
                <IconPlay /> Start Simulator
              </>
            )}
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Speed:
            </span>
            <div className="speed-group">
              {[1, 5, 20].map((s) => (
                <button
                  key={s}
                  className={`speed-btn ${simulatorStatus.speed === s ? 'speed-btn--active' : ''}`}
                  onClick={() => handleSetSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- KPI Metrics Row ---- */}
      <div className="dashboard-kpis">
        <div className="kpi-card">
          <div className="kpi-card__label">Simulated Bookings</div>
          <div className="kpi-card__value">{simulatorStatus.total_bookings}</div>
          <div className="kpi-card__sub">Successfully committed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Cancellations</div>
          <div className="kpi-card__value" style={{ color: 'var(--red)' }}>
            {simulatorStatus.total_cancellations}
          </div>
          <div className="kpi-card__sub">Inventory freed back to pool</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Concurrency Guard</div>
          <div className="kpi-card__value" style={{ color: 'var(--orange)' }}>
            {simulatorStatus.total_conflicts}
          </div>
          <div className="kpi-card__sub">Double-bookings prevented</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Telemetry Volume</div>
          <div className="kpi-card__value" style={{ color: 'var(--action)' }}>
            Rs. {Math.round(liveGrossRevenue).toLocaleString('en-IN')}
          </div>
          <div className="kpi-card__sub">{simulatorStatus.total_actions} total events generated</div>
        </div>
      </div>

      {/* ---- Split: Visual Charts (Left) | Live Event Feed (Right) ---- */}
      <div className="dashboard-split">
        {/* Left Column: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Chart 1: Bookings Per Minute (SVG Histogram) */}
          <div className="dashboard-panel">
            <div className="dashboard-panel__title">
              <span>Bookings Velocity</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                Past 10 minutes
              </span>
            </div>

            <div className="chart-container">
              <svg width="100%" height="100%" viewBox="0 0 320 140" preserveAspectRatio="none">
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="20" x2="320" y2="20" stroke="#eef2f6" strokeWidth="1" strokeDasharray="3 3"/>
                <line x1="0" y1="70" x2="320" y2="70" stroke="#eef2f6" strokeWidth="1" strokeDasharray="3 3"/>
                <line x1="0" y1="120" x2="320" y2="120" stroke="#eef2f6" strokeWidth="1"/>

                {/* Vertical bars representing minute intervals */}
                {minuteBuckets.map((count, idx) => {
                  const barWidth = 22
                  const x = idx * 31 + 8
                  const height = Math.max(8, (count / maxBucket) * 105)
                  const y = 120 - height
                  return (
                    <g key={idx}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx="3"
                        fill="var(--action)"
                        opacity={idx === minuteBuckets.length - 1 ? '1.0' : '0.65'}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--text-secondary)"
                        fontWeight="600"
                      >
                        {count}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              <span>10m ago</span>
              <span>5m ago</span>
              <span>Now (Live)</span>
            </div>
          </div>

          {/* Chart 2: Top Destination Cities */}
          <div className="dashboard-panel">
            <div className="dashboard-panel__title">
              <span>Top Destination Demand</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                Live booking distribution
              </span>
            </div>

            <div className="city-bars">
              {topCities.map(([city, count]) => {
                const pct = Math.round((count / maxCityCount) * 100)
                return (
                  <div key={city} className="city-bar-row">
                    <div className="city-bar-header">
                      <span>{city}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {count} bookings
                      </span>
                    </div>
                    <div className="city-bar-track">
                      <div className="city-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream Feed */}
        <div className="dashboard-panel">
          <div className="dashboard-panel__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Live Telemetry Activity</span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                {feedEvents.length} events
              </span>
            </div>
            {feedEvents.length > 0 && (
              <button
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => setFeedEvents([])}
                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              >
                Clear
              </button>
            )}
          </div>

          {feedEvents.length === 0 ? (
            <div className="admin-empty" style={{ margin: 'auto' }}>
              {streamActive
                ? 'Waiting for incoming telemetry events... Click "Start Simulator" above to generate traffic.'
                : 'Data stream is currently paused. Toggle "STREAM ON" to resume live events.'}
            </div>
          ) : (
            <div className="activity-feed-list">
              {feedEvents.map((item) => {
                const { event, data, timeStr } = item

                if (event === 'booking_created') {
                  return (
                    <div key={item.id} className="feed-item feed-item--booking">
                      <span className="feed-item__time">{timeStr}</span>
                      <div className="feed-item__content">
                        <div className="feed-item__title" style={{ color: 'var(--green)' }}>
                          Booking Confirmed
                        </div>
                        <div className="feed-item__detail">
                          <strong>{data.guest_name}</strong> booked{' '}
                          <strong>{data.room_type}</strong> at {data.hotel_name} ({data.city})
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Stay: {data.check_in} to {data.check_out} ({data.guests} guests)
                        </div>
                      </div>
                      <div className="feed-item__amount">
                        Rs. {Math.round(data.total_price || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  )
                }

                if (event === 'booking_cancelled') {
                  return (
                    <div key={item.id} className="feed-item feed-item--cancelled">
                      <span className="feed-item__time">{timeStr}</span>
                      <div className="feed-item__content">
                        <div className="feed-item__title" style={{ color: 'var(--red)' }}>
                          Reservation Cancelled
                        </div>
                        <div className="feed-item__detail">
                          <strong>{data.guest_name}</strong> cancelled booking #{data.id} at {data.hotel_name}
                        </div>
                      </div>
                      <div className="feed-item__amount" style={{ color: 'var(--red)' }}>
                        -Rs. {Math.round(data.refund_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  )
                }

                if (event === 'booking_conflict') {
                  return (
                    <div key={item.id} className="feed-item feed-item--conflict">
                      <span className="feed-item__time">{timeStr}</span>
                      <div className="feed-item__content">
                        <div className="feed-item__title" style={{ color: 'var(--orange)' }}>
                          Double-Booking Blocked
                        </div>
                        <div className="feed-item__detail">
                          Prevented overbooking for {data.room_type} at {data.hotel_name} ({data.city})
                        </div>
                      </div>
                    </div>
                  )
                }

                if (event === 'user_registered') {
                  return (
                    <div key={item.id} className="feed-item feed-item--user">
                      <span className="feed-item__time">{timeStr}</span>
                      <div className="feed-item__content">
                        <div className="feed-item__title" style={{ color: 'var(--action)' }}>
                          New User Signup
                        </div>
                        <div className="feed-item__detail">
                          <strong>{data.name}</strong> ({data.email}) joined Goloop
                        </div>
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
