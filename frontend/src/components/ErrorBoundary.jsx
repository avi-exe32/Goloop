/*
  ErrorBoundary.jsx — Global React Error Boundary component.

  WHY class component?
  React's Error Boundary API requires lifecycle methods (componentDidCatch,
  getDerivedStateFromError) which are only supported in class components.

  WHY is this critical for user experience?
  Without an Error Boundary, any unhandled JavaScript error or malformed data
  unmounts the entire React tree, leaving the user with a blank white screen.
  This component intercepts crashes and displays a friendly recovery screen.
*/

import React from 'react'

const IconAlert = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4111E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // In production you would log to Sentry or an error reporting endpoint
    console.error('Unhandled render error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: '600px',
            margin: '60px auto',
            padding: '32px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #E7E7E7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <IconAlert />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>
            Something went wrong
          </h2>

          <p style={{ color: '#595959', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
            An unexpected error occurred while displaying this page. You can try refreshing the page or navigating back to the home page.
          </p>

          {this.state.error && (
            <div
              style={{
                background: '#F8F9FA',
                padding: '12px 16px',
                borderRadius: '4px',
                border: '1px solid #E7E7E7',
                color: '#D4111E',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '24px',
                maxHeight: '120px',
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                background: '#0071C2',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                background: '#F5F5F5',
                color: '#1A1A1A',
                border: '1px solid #C2C2C2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
