import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider, ConfirmProvider } from './components/ui/feedback';
import './index.css';

// Falha inesperada: tela da marca com um botão para recarregar
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
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-page">
        <div className="panel max-w-md w-full p-8 text-center">
          <img src={`${import.meta.env.BASE_URL}logo-oilema-simbolo.png`} alt="" className="w-12 h-12 mx-auto" />
          <h1 className="t-brand-title uppercase text-ink-strong mt-4">Pluviômetro</h1>
          <p className="text-[15px] leading-[22px] text-ink-muted mt-2">Algo deu errado ao abrir o painel. Recarregue a página; as leituras gravadas não se perdem.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary btn-lg mt-6">Recarregar a página</button>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-[11px] leading-4 text-danger bg-surface-sunken border border-line rounded-lg p-3 overflow-x-auto">{String(this.state.error)}</pre>
          )}
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
