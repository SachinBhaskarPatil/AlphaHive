import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Zap, Brain, TrendingUp, Eye, LineChart, Shield, ArrowRight, ChevronDown,
  Sparkles, BarChart3, Check, Menu, X,
} from 'lucide-react';
import { AgentSwarm, AGENTS } from '../components/AIExperience';
import LandingProductMock from '../components/LandingProductMock';
import { Button, Eyebrow, Heading, Text, Surface, Badge, IconButton } from '../components/ui/primitives';
import { StaggerItem, StaggerList } from '../components/ui/motion';
import { useIsMobile } from '../hooks/useMediaQuery';

const ANALYSIS_MODULES = AGENTS.length;
const PLATFORM_AGENTS = 4;

const METRICS = [
  { value: String(ANALYSIS_MODULES), label: 'Analysis modules', sub: 'LangGraph market pipeline' },
  { value: String(PLATFORM_AGENTS), label: 'Platform agents', sub: 'Agent Brain roster' },
  { value: 'NSE/BSE', label: 'Markets', sub: 'Indian equities focus' },
];

const FEATURES = [
  {
    icon: Brain, title: 'Agent swarm intelligence',
    desc: `${ANALYSIS_MODULES} analysis modules run technicals, sentiment, fundamentals, forensics, and institutional flow in parallel during market analysis.`,
    accent: 'var(--accent-violet)',
  },
  {
    icon: TrendingUp, title: 'Persona-matched portfolios',
    desc: 'Risk quiz maps you to Hunter, Defender, Compounder, or Preserver — then AI builds validated allocations.',
    accent: 'var(--accent-emerald)',
  },
  {
    icon: Eye, title: 'Smart money tracking',
    desc: 'Shadow Tracker surfaces institutional accumulation, distribution, and sector rotation before headlines.',
    accent: 'var(--accent-rose)',
  },
  {
    icon: LineChart, title: '2026 forecast scenarios',
    desc: 'Historical seasonality becomes conservative, baseline, and aggressive price paths with confidence bands.',
    accent: 'var(--accent-blue)',
  },
  {
    icon: BarChart3, title: 'Market command center',
    desc: 'Heatmaps, correlation matrices, rebalance engines, and LangGraph batch intelligence in one workspace.',
    accent: 'var(--accent-cyan)',
  },
  {
    icon: Shield, title: 'Institutional trust',
    desc: 'Executive-grade reports, audit trails, and transparent agent reasoning — built for serious investors.',
    accent: 'var(--accent-amber)',
  },
];

const FAQ = [
  { q: 'What makes AlphaHive different?', a: 'AlphaHive combines a LangGraph analysis pipeline (10 modules), portfolio tools, shadow tracking, forecasts, and an Agent Brain roster in one workspace — with reasoning visible in reports.' },
  { q: 'Is this financial advice?', a: 'No. AlphaHive generates AI-powered research and scenarios. All outputs include disclaimers. Always do your own due diligence.' },
  { q: 'Which markets are supported?', a: 'Primary focus on Indian equities (NSE/BSE) with index benchmarks, sector intelligence, and institutional flow tracking.' },
  { q: 'How does authentication work?', a: 'Secure Google OAuth. We never store your password. Your workspace persists across sessions.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`landing-faq__item${open ? ' landing-faq__item--open' : ''}`}>
      <button type="button" className="landing-faq__q" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <ChevronDown size={18} className="landing-faq__chev" />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="landing-faq__a-wrap"
      >
        <p className="landing-faq__a">{a}</p>
      </motion.div>
    </div>
  );
}

export default function LandingPage({ onSignIn, onLaunch }) {
  const isMobile = useIsMobile();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#product', label: 'Product' },
    { href: '#faq', label: 'FAQ' },
  ];

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    document.body.classList.add('mr-nav-open');
    return () => document.body.classList.remove('mr-nav-open');
  }, [mobileNavOpen]);

  return (
    <div className="landing">
      <div className="landing__grain" aria-hidden />
      <div className="landing__mesh" aria-hidden />

      <nav className="landing-nav">
        <a href="#" className="landing-nav__brand" onClick={(e) => e.preventDefault()}>
          <span className="landing-nav__logo"><Zap size={20} strokeWidth={2.4} /></span>
          <span className="gradient-text">AlphaHive</span>
        </a>
        <div className="landing-nav__links">
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>
        <div className="landing-nav__actions">
          <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
          <Button size="sm" onClick={onLaunch}>
            Launch console <ArrowRight size={16} />
          </Button>
        </div>
        <IconButton
          label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          className="landing-nav__toggle"
          onClick={() => setMobileNavOpen((v) => !v)}
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </IconButton>
      </nav>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              className="landing-nav__drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileNav}
            />
            <motion.aside
              className="landing-nav__drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="landing-nav__drawer-head">
                <span className="gradient-text" style={{ fontWeight: 900 }}>AlphaHive</span>
                <IconButton label="Close menu" onClick={closeMobileNav}><X size={18} /></IconButton>
              </div>
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="landing-nav__drawer-link"
                  onClick={closeMobileNav}
                >
                  {label}
                </a>
              ))}
              <div className="landing-nav__drawer-actions">
                <Button variant="ghost" onClick={() => { closeMobileNav(); onSignIn(); }}>Sign in</Button>
                <Button onClick={() => { closeMobileNav(); onLaunch(); }}>
                  Launch console <ArrowRight size={16} />
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.section
        className="landing-hero"
        style={isMobile ? undefined : { y: heroY, opacity: heroOpacity }}
      >
        <div className="landing-hero__copy">
          <Eyebrow>AI-native investing intelligence</Eyebrow>
          <Heading as="h1" size="hero" className="landing-hero__title">
            The AI operating system for investors who think in{' '}
            <span className="gradient-text-animated">swarms</span>, not spreadsheets.
          </Heading>
          <Text muted className="landing-hero__sub">
            AlphaHive runs {ANALYSIS_MODULES} analysis modules in parallel through LangGraph —
            then briefs you from your portfolio, shadow signals, and saved forecasts.
          </Text>
          <div className="landing-hero__cta">
            <Button size="lg" onClick={onLaunch}>
              <Sparkles size={18} /> Launch your swarm
            </Button>
            <Button variant="ghost" size="lg" onClick={onSignIn}>
              Sign in with Google
            </Button>
          </div>
          <div className="landing-hero__proof">
            <Badge tone="emerald" className="landing-hero__status">Research workspace</Badge>
            <Text className="landing-hero__trust">Sign in with Google to save your persona, portfolios, and forecasts.</Text>
          </div>
        </div>
        <div className="landing-hero__visual">
          <div className="landing-hero__orb" aria-hidden />
          <div className="landing-hero__swarm-wrap">
            <AgentSwarm size={isMobile ? 300 : 360} pulse />
          </div>
        </div>
        <a href="#features" className="landing-hero__scroll" aria-label="Scroll to features">
          <ChevronDown size={22} />
        </a>
      </motion.section>

      <section className="landing-metrics">
        <StaggerList className="landing-metrics__grid">
          {METRICS.map((m) => (
            <StaggerItem key={m.label}>
              <Surface className="landing-metric">
                <p className="landing-metric__value tabular">{m.value}</p>
                <p className="landing-metric__label">{m.label}</p>
                <p className="landing-metric__sub">{m.sub}</p>
              </Surface>
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-section__head">
          <Eyebrow>Capabilities</Eyebrow>
          <Heading size="xl">Built for decisions, not decoration</Heading>
          <Text muted>Every module is an AI workspace — designed to reduce cognitive load and increase conviction.</Text>
        </div>
        <StaggerList className="landing-bento">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={f.title}>
                <Surface interactive className="landing-feature">
                  <span className="landing-feature__icon" style={{ color: f.accent, background: `${f.accent}14`, borderColor: `${f.accent}30` }}>
                    <Icon size={22} />
                  </span>
                  <Heading as="h3" size="sm">{f.title}</Heading>
                  <Text muted>{f.desc}</Text>
                </Surface>
              </StaggerItem>
            );
          })}
        </StaggerList>
      </section>

      <section id="product" className="landing-section landing-showcase">
        <div className="landing-showcase__inner">
          <div className="landing-showcase__copy">
            <Eyebrow>Product preview</Eyebrow>
            <Heading size="xl">A workspace that feels alive</Heading>
            <Text muted>
              Command Center, portfolio optimization, market heatmaps, and agent brain —
              unified in a glass interface that breathes with your research flow.
            </Text>
            <ul className="landing-showcase__list">
              {['Market & portfolio analysis', 'Shadow tracker & sector flow', 'Saved forecasts & calendar', 'Agent Brain memory & health'].map((item) => (
                <li key={item}><Check size={16} /> {item}</li>
              ))}
            </ul>
            <Button onClick={onLaunch}>Experience it <ArrowRight size={16} /></Button>
          </div>
          <div className="landing-showcase__mock">
            <LandingProductMock />
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section landing-section--narrow">
        <div className="landing-section__head">
          <Eyebrow>FAQ</Eyebrow>
          <Heading size="lg">Questions answered</Heading>
        </div>
        <div className="landing-faq">
          {FAQ.map((item) => <FaqItem key={item.q} {...item} />)}
        </div>
      </section>

      <section className="landing-cta">
        <Surface glow className="landing-cta__inner">
          <Heading size="lg">Open your research workspace</Heading>
          <Text muted>Sign in, complete your investor profile, then run analysis from the Command Center.</Text>
          <Button size="lg" onClick={onLaunch}>
            <Zap size={18} /> Launch AlphaHive
          </Button>
        </Surface>
      </section>

      <footer className="landing-footer">
        <span className="gradient-text">AlphaHive</span>
        <Text faint>© {new Date().getFullYear()} · AI research workspace · Not financial advice</Text>
      </footer>
    </div>
  );
}
