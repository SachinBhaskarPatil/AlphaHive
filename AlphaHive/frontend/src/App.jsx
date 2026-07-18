import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { api, profileApi } from './api';
import { useCommandModal } from './context/CommandModalContext';
import { HiveLoader } from './components/Shared';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import { NAV_ITEMS } from './config/navigation';
import ProfileTab from './tabs/ProfileTab';

const HomeTab = lazy(() => import('./tabs/HomeTab'));
const DashboardTab = lazy(() => import('./tabs/DashboardTab'));
const PortfolioTab = lazy(() => import('./tabs/PortfolioTab'));
const ShadowTab = lazy(() => import('./tabs/ShadowTab'));
const ForecastTab = lazy(() => import('./tabs/ForecastTab'));
const CalendarTab = lazy(() => import('./tabs/CalendarTab'));
const BrainTab = lazy(() => import('./tabs/BrainTab'));
const HealthTab = lazy(() => import('./tabs/HealthTab'));

const SESSION_KEY = 'mr_auth_session';

function TabFallback() {
  return (
    <div className="ah-tab-fallback">
      <HiveLoader size={44} />
      <p>Loading workspace…</p>
    </div>
  );
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.handle) {
      return {
        handle: parsed.handle,
        provider: parsed.provider || 'Google',
        name: parsed.name || '',
        picture: parsed.picture || '',
      };
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

function saveSession(identity) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function normalizeAppPath() {
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    window.history.replaceState({}, document.title, '/');
  }
}

function isAuthCallbackPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/auth/callback';
}

export default function App() {
  const { showAlert } = useCommandModal();
  const [gate, setGate] = useState(() => {
    const session = loadSession();
    const params = new URLSearchParams(window.location.search);
    if (session && isAuthCallbackPath() && !params.has('code')) {
      normalizeAppPath();
    }
    return session ? 'app' : 'landing';
  });
  const [socialIdentity, setSocialIdentity] = useState(() => loadSession() || { handle: '', provider: '', name: '', picture: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!loadSession());
  const [activeTab, setActiveTab] = useState('profile');
  const [persona, setPersona] = useState('Not Set');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(
    () => isAuthCallbackPath() && new URLSearchParams(window.location.search).has('code'),
  );
  const oauthExchangeStarted = useRef(false);
  const initialTabSet = useRef(false);

  const handleCallback = useCallback(async (code, provider = 'Google') => {
    try {
      const { data } = await api.post(`/api/auth/${provider.toLowerCase()}/callback`, { code });
      if (data.handle) {
        const identity = {
          handle: data.handle,
          provider: data.provider || provider,
          name: data.name || '',
          picture: data.picture || '',
        };
        setSocialIdentity(identity);
        saveSession(identity);
        setIsLoggedIn(true);
        setGate('app');
        normalizeAppPath();
      }
    } catch (e) {
      oauthExchangeStarted.current = false;
      try { sessionStorage.removeItem(`oauth_used_${code}`); } catch { /* ignore */ }
      const err = e.response?.data?.error_description || e.response?.data?.error || e.message;
      if (String(err).toLowerCase().includes('invalid_grant') || String(err).toLowerCase().includes('bad request')) {
        normalizeAppPath();
        setGate('landing');
        return;
      }
      showAlert(`Auth failed: ${err}`, { variant: 'error', title: 'Sign-in failed' });
      normalizeAppPath();
      setGate('landing');
    } finally {
      setAuthBootstrapping(false);
    }
  }, [showAlert]);

  const handleLogin = async (provider) => {
    setLoggingIn(true);
    try {
      const { data } = await api.get(`/api/auth/${provider.toLowerCase()}/url`);
      if (data.url) window.location.href = data.url;
      else setLoggingIn(false);
    } catch {
      setLoggingIn(false);
      showAlert(`${provider} connection failed. Is the backend running?`, {
        variant: 'error',
        title: 'Connection failed',
      });
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!socialIdentity.handle) return;
    try {
      const { data } = await profileApi.get(socialIdentity.handle);
      setPersona(data.persona || 'Not Set');
      const complete = data.status?.onboarding_complete === true;
      setOnboardingComplete(complete);
      const authName = data.profile?.auth_name;
      const authPicture = data.profile?.auth_picture;
      if (authName || authPicture) {
        setSocialIdentity((prev) => {
          const next = {
            ...prev,
            name: authName || prev.name,
            picture: authPicture || prev.picture,
          };
          saveSession(next);
          return next;
        });
      }
      if (!initialTabSet.current) {
        initialTabSet.current = true;
        if (!complete || data.persona === 'Not Set') setActiveTab('profile');
        else setActiveTab('home');
      }
    } catch (e) {
      console.error(e);
    }
  }, [socialIdentity.handle]);

  const unlocked = onboardingComplete && persona !== 'Not Set';
  const lockedTabIds = useMemo(() => new Set(NAV_ITEMS.map((item) => item.id)), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      if (isAuthCallbackPath()) normalizeAppPath();
      return;
    }

    if (isLoggedIn) {
      normalizeAppPath();
      return;
    }

    if (oauthExchangeStarted.current) return;

    const usedKey = `oauth_used_${code}`;
    if (sessionStorage.getItem(usedKey)) {
      normalizeAppPath();
      setAuthBootstrapping(false);
      return;
    }

    oauthExchangeStarted.current = true;
    sessionStorage.setItem(usedKey, '1');
    setAuthBootstrapping(true);

    const state = params.get('state') || 'google';
    const provider = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    handleCallback(code, provider);
  }, [handleCallback, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && socialIdentity.handle) fetchProfile();
  }, [isLoggedIn, socialIdentity.handle, fetchProfile]);

  useEffect(() => {
    if (!unlocked && lockedTabIds.has(activeTab)) {
      setActiveTab('profile');
    }
  }, [unlocked, activeTab, lockedTabIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && onboardingComplete) setActiveTab(tab);
    const ticker = params.get('ticker');
    if (ticker && onboardingComplete) setActiveTab('dashboard');
    else if (tab === 'home' && onboardingComplete) setActiveTab('home');
  }, [onboardingComplete]);

  const selectTab = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setSocialIdentity({ handle: '', provider: '', name: '', picture: '' });
    setPersona('Not Set');
    setOnboardingComplete(false);
    setActiveTab('profile');
    initialTabSet.current = false;
    oauthExchangeStarted.current = false;
    setAuthBootstrapping(false);
    normalizeAppPath();
    setGate('landing');
  };

  if (authBootstrapping) {
    return (
      <div className="ah-auth-bootstrap">
        <HiveLoader size={48} />
        <p>Signing you in…</p>
      </div>
    );
  }

  if (gate === 'landing') {
    return (
      <LandingPage
        onSignIn={() => setGate('auth')}
        onLaunch={() => setGate('auth')}
      />
    );
  }

  if (gate === 'auth' && !isLoggedIn) {
    return (
      <AuthPage
        onLogin={handleLogin}
        loggingIn={loggingIn}
        onBack={() => setGate('landing')}
      />
    );
  }

  const mainContent = (
    <Suspense fallback={<TabFallback />}>
      {activeTab === 'profile' && (
        <ProfileTab
          key="profile"
          handle={socialIdentity.handle}
          persona={persona}
          setPersona={setPersona}
          onNavigate={selectTab}
          onOnboardingComplete={() => { setOnboardingComplete(true); setActiveTab('home'); fetchProfile(); }}
        />
      )}
      {unlocked && activeTab === 'home' && (
        <HomeTab key="home" handle={socialIdentity.handle} persona={persona} onNavigate={selectTab} />
      )}
      {unlocked && activeTab === 'portfolio' && (
        <PortfolioTab key="portfolio" handle={socialIdentity.handle} persona={persona} />
      )}
      {unlocked && activeTab === 'dashboard' && (
        <DashboardTab key="dashboard" handle={socialIdentity.handle} />
      )}
      {unlocked && activeTab === 'shadow' && (
        <ShadowTab key="shadow" handle={socialIdentity.handle} onNavigate={selectTab} />
      )}
      {unlocked && activeTab === 'forecasts' && (
        <ForecastTab key="forecasts" handle={socialIdentity.handle} onNavigate={selectTab} />
      )}
      {unlocked && activeTab === 'calendar' && <CalendarTab key="calendar" />}
      {unlocked && activeTab === 'brain' && <BrainTab key="brain" handle={socialIdentity.handle} />}
      {unlocked && activeTab === 'health' && <HealthTab key="health" />}
      {isLoggedIn && activeTab !== 'profile' && (!unlocked || !NAV_ITEMS.some((n) => n.id === activeTab)) && (
        <TabFallback key="tab-fallback" />
      )}
    </Suspense>
  );

  return (
    <AppShell
      activeTab={activeTab}
      selectTab={selectTab}
      unlocked={unlocked}
      persona={persona}
      socialIdentity={socialIdentity}
      onLogout={handleLogout}
    >
      {mainContent}
    </AppShell>
  );
}
