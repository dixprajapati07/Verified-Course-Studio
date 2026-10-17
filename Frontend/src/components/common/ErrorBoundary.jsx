import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg-base, #09090b)',
          color: 'var(--text-primary, #f4f4f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'var(--bg-card, #18181b)',
            border: '1px solid var(--border, #27272a)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} color="var(--status-failed, #ef4444)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-primary, #ffffff)' }}>
                  Something went wrong
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #a1a1aa)', margin: '0.2rem 0 0' }}>
                  An unexpected error occurred while rendering this page.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-base, #0d0d0e)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.8rem',
              color: 'var(--status-failed, #f87171)',
              wordBreak: 'break-word',
              maxHeight: '160px',
              overflowY: 'auto'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'var(--btn-primary-bg, #ffffff)',
                  color: 'var(--btn-primary-text, #000000)',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={this.handleReset}
              >
                <RotateCcw size={14} /> Try Again
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--text-primary, #ffffff)',
                  border: '1px solid var(--border, #3f3f46)',
                  cursor: 'pointer'
                }}
                onClick={() => { window.location.href = '/dashboard'; }}
              >
                <Home size={14} /> Go to Dashboard
              </button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #a1a1aa)',
                  border: 'none',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
