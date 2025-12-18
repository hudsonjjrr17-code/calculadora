import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple Error Boundary to catch runtime errors
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Replaced the constructor with a class property for state initialization.
  // The constructor-based approach was causing type errors where 'state' and 'props'
  // were not being recognized on the component instance. This is a more direct
  // and modern way to initialize state in React class components.
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 20, color: 'white', backgroundColor: '#111', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <h1 style={{fontSize: '24px', marginBottom: '10px', color: '#ef4444'}}>Ocorreu um erro</h1>
          <p>O aplicativo encontrou um problema inesperado.</p>
          <pre style={{color: '#facc15', overflow: 'auto', marginTop: '20px', fontSize: '12px', padding: '10px', background: '#000'}}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{padding: '12px', marginTop: '20px', background: '#333', color: 'white', border: 'none', borderRadius: '8px'}}>
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
