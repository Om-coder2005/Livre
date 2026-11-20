import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Livre ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAF7F2',
            color: '#2B231D',
            fontFamily: "'Newsreader', Georgia, serif",
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              background: '#FFFFFF',
              border: '1px solid rgba(43, 35, 29, 0.12)',
              borderRadius: '16px',
              padding: '2.5rem 2rem',
              boxShadow: '0 10px 30px rgba(43, 35, 29, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: '#C86D51',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}
            >
              The Reading Room
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: '2.2rem',
                fontWeight: 400,
                color: '#1B382B',
                lineHeight: 1.2,
                marginBottom: '1rem',
              }}
            >
              A quiet pause in your reading.
            </h1>
            <p
              style={{
                fontSize: '0.96rem',
                lineHeight: 1.6,
                color: '#5C4C40',
                marginBottom: '1.75rem',
              }}
            >
              The page encountered an unexpected issue while rendering. Your books and reading progress remain safely stored.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#1B382B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  background: 'transparent',
                  color: '#1B382B',
                  border: '1px solid rgba(27, 56, 43, 0.3)',
                  borderRadius: '24px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                Return to Library
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
