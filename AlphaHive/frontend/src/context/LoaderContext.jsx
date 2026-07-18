import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AILoader } from '../components/Shared';
import { AgentSwarm } from '../components/AIExperience';

const LoaderContext = createContext(null);

function AppLoaderOverlay({ message }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(7, 10, 18, 0.78)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        animation: 'fadeIn 0.3s var(--ease-out)',
      }}
    >
      <div
        className="glass-card glow-ring"
        style={{
          borderRadius: 28,
          maxWidth: 420,
          width: '90%',
          padding: '0.5rem 1rem 1.5rem',
        }}
      >
        <AILoader title="Agents at work" message={message} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.5rem', opacity: 0.85 }}>
          <AgentSwarm size={120} pulse />
        </div>
      </div>
    </div>
  );
}

export function LoaderProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');

  const showLoader = useCallback((text = 'Loading...') => {
    setMessage(text);
    setLoading(true);
  }, []);

  const updateLoader = useCallback((text) => {
    setMessage(text);
  }, []);

  const hideLoader = useCallback(() => {
    setLoading(false);
    setMessage('Loading...');
  }, []);

  const value = useMemo(
    () => ({ loading, showLoader, updateLoader, hideLoader }),
    [loading, showLoader, updateLoader, hideLoader],
  );

  return (
    <LoaderContext.Provider value={value}>
      {children}
      {loading && <AppLoaderOverlay message={message} />}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error('useLoader must be used within LoaderProvider');
  return ctx;
}
