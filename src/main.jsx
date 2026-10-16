import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── Global Error Boundary ─────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111E23',
          color: '#ECF0F1',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: '2rem',
          textAlign: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>🌧️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F28322' }}>
            Pluviômetro Oilema
          </h1>
          <p style={{ color: '#8DA0A7', maxWidth: 400 }}>
            Ocorreu um erro inesperado ao iniciar o sistema. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              background: '#F28322',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Recarregar Página
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: '1rem',
              background: '#1A2B31',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.7rem',
              color: '#f87171',
              maxWidth: '90vw',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
// ───────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
