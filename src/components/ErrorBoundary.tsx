import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  override componentDidCatch(error: Error): void {
    console.error('AURA TIME ErrorBoundary caught:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('aura_living_lens_settings_v3');
      localStorage.removeItem('aura_living_lens_sessions_v2');
      localStorage.removeItem('aura_restore_sessions_v1');
      localStorage.removeItem('aura_living_lens_state_v4');
      localStorage.removeItem('aura_selected_soundscape_v2');
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            width: '100%',
            backgroundColor: '#070812',
            color: '#F5F6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily:
              "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: 'rgba(13, 16, 35, 0.96)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '24px',
              padding: '28px',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#2FE8FF',
                marginBottom: '8px',
              }}
            >
              AURA TIME · SANCTUARY RECOVERY
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 600,
                margin: '0 0 8px 0',
                color: '#F5F6FF',
              }}
            >
              Unable to render current view
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A3A1BA',
                margin: '0 0 20px 0',
                lineHeight: 1.5,
              }}
            >
              {this.state.errorMessage}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #F5F6FF 0%, #2FE8FF 100%)',
                  color: '#070812',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload Sanctuary
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#F5F6FF',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '9999px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset Saved State
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
