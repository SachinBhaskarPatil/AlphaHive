import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/v2.css'
import App from './App.jsx'
import { LoaderProvider } from './context/LoaderContext.jsx'
import { CommandModalProvider } from './context/CommandModalContext.jsx'

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="ah-auth-bootstrap">
          <h1 style={{ fontSize: '1.1rem', margin: 0 }}>Something went wrong</h1>
          <p style={{ maxWidth: 420, textAlign: 'center', opacity: 0.8 }}>
            {this.state.error.message || 'The app hit an unexpected error.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '0.65rem 1.2rem', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(99,102,241,0.25)',
              color: '#fff', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <CommandModalProvider>
        <LoaderProvider>
          <App />
        </LoaderProvider>
      </CommandModalProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
