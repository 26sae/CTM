import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <div className="error-card">
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              fontSize: '1.4rem',
            }}>
              !
            </div>
            <h2>Something went wrong</h2>
            <p>We could not finish loading this page. Try again, or return to the home screen.</p>

            {import.meta.env.DEV && this.state.error && (
              <pre>{this.state.error.toString()}</pre>
            )}

            <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 6 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={this.resetError}>
                Try again
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => { window.location.href = '/'; }}
              >
                Go home
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
