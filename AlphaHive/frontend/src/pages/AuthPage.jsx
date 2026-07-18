import { motion } from 'framer-motion';
import { Zap, Globe, Lock, Brain, TrendingUp, LineChart, ArrowLeft } from 'lucide-react';
import { AgentSwarm } from '../components/AIExperience';
import { Button, Eyebrow, Heading, Text, Surface } from '../components/ui/primitives';
import { StaggerItem, StaggerList } from '../components/ui/motion';

const FEATURES = [
  { icon: Brain, title: 'Agentic intelligence', desc: 'Parallel LangGraph agents analyze every holding in real time.' },
  { icon: TrendingUp, title: 'Smart portfolios', desc: 'Persona-matched allocations, validated automatically.' },
  { icon: LineChart, title: 'Forecasts & seasonality', desc: 'Historical patterns turned into 2026 scenarios.' },
];

export default function AuthPage({ onLogin, loggingIn, onBack }) {
  return (
    <div className="auth-page">
      <div className="auth-page__mesh" aria-hidden />
      <Button variant="ghost" size="sm" className="auth-page__back" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </Button>

      <div className="auth-page__grid">
        <motion.div
          className="auth-page__hero"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="auth-page__brand">
            <span className="auth-page__logo"><Zap size={24} strokeWidth={2.4} /></span>
            <span className="gradient-text">ALPHAHIVE</span>
          </div>
          <Eyebrow>Secure workspace access</Eyebrow>
          <Heading as="h1" size="xl">
            Activate your <span className="gradient-text-animated">AI swarm</span>
          </Heading>
          <Text muted>
            Ten agents. One console. Institutional-grade research — personalized to your risk persona.
          </Text>
          <div className="auth-page__swarm">
            <AgentSwarm size={220} pulse />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Surface glow className="auth-page__card">
            <Heading as="h2" size="md">Welcome back</Heading>
            <Text muted className="auth-page__card-sub">Sign in to resume your intelligence workspace.</Text>

            <StaggerList className="auth-page__features">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <StaggerItem key={title} className="auth-page__feature">
                  <span className="auth-page__feature-icon"><Icon size={18} /></span>
                  <div>
                    <p className="auth-page__feature-title">{title}</p>
                    <Text faint>{desc}</Text>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>

            <Button
              variant="secondary"
              size="lg"
              className="auth-page__google"
              onClick={() => onLogin('Google')}
              disabled={loggingIn}
            >
              {loggingIn ? <span className="mr-spinner" style={{ width: 18, height: 18 }} /> : <Globe size={20} />}
              {loggingIn ? 'Connecting…' : 'Continue with Google'}
            </Button>

            <p className="auth-page__secure">
              <Lock size={12} /> Secure OAuth — we never see your password.
            </p>

            <p className="auth-page__browser-hint">
              Google sign-in requires a full browser (Chrome, Edge, or Firefox).
              If you see &ldquo;Access blocked&rdquo; or error 403, open{' '}
              <a href={window.location.origin} target="_blank" rel="noopener noreferrer">
                {window.location.origin}
              </a>{' '}
              in your browser instead of an IDE preview panel.
            </p>
          </Surface>
        </motion.div>
      </div>
    </div>
  );
}
