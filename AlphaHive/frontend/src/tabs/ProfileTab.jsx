import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, TrendingUp, Activity, Database, RotateCcw, ChevronLeft, Search, Check, Save, X,
  Briefcase, Sparkles,
} from 'lucide-react';
import { GlassCard, SectionHeader, HiveLoader } from '../components/Shared';
import { HeroBanner, InsightCard, PageShell, AgentSwarm } from '../components/AIExperience';
import { MarketPulseStrip, AnimatedCounter } from '../components/MissionControl';
import { Button, Eyebrow, Surface } from '../components/ui/primitives';
import SimulationChart from '../components/SimulationChart';
import { profileApi, portfolioApi } from '../api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useLoader } from '../context/LoaderContext';
import { useCommandModal } from '../context/CommandModalContext';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function personaEmoji(id) {
  if (id?.includes('Hunter')) return '🦅';
  if (id?.includes('Defender')) return '🛡️';
  if (id?.includes('Preserver')) return '🌱';
  if (id?.includes('Compounder')) return '🚀';
  return '✨';
}

const QUIZ = [
  { key: 'q1', label: '1/3 — Panic Test', question: 'Market crashes 20%. Your reaction?',
    choices: [{ text: 'Sell everything', score: 1 }, { text: 'Wait and watch', score: 2 }, { text: 'Buy more', score: 3 }] },
  { key: 'q2', label: '2/3 — Deadline', question: 'When do you need this capital?',
    choices: [{ text: '< 3 years', score: 1 }, { text: '3–7 years', score: 2 }, { text: '> 7 years', score: 3 }] },
  { key: 'q3', label: '3/3 — Cushion', question: 'If portfolio drops 50%, lifestyle changes?',
    choices: [{ text: 'Significantly affected', score: 1 }, { text: 'Cut some luxuries', score: 2 }, { text: 'No impact', score: 3 }] },
];

const PERSONA_MAX_BRANDS = {
  'The Preserver': 3,
  'The Defender': 3,
  'The Compounder': 4,
  'The Hunter': 6,
};

const PERSONAS = [
  { id: 'The Hunter', color: '#10b981', icon: <TrendingUp />, desc: 'Aggressive alpha seeker.' },
  { id: 'The Defender', color: '#3b82f6', icon: <Shield />, desc: 'Capital preservation first.' },
  { id: 'The Compounder', color: '#8b5cf6', icon: <Activity />, desc: 'Moderate multi-cap growth.' },
  { id: 'The Preserver', color: '#f59e0b', icon: <Database />, desc: 'Ultra-conservative.' },
];

function personaInfo(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

function quizAnswers(scores) {
  return QUIZ.map((q) => {
    const choice = q.choices.find((c) => c.score === scores[q.key]);
    return { label: q.label, question: q.question, answer: choice?.text || '—' };
  });
}

function enrichHoldings(smartResult) {
  if (!smartResult?.holdings?.length) return [];
  return smartResult.holdings.map((h) => {
    const sym = h.Symbol || h.symbol;
    const v = smartResult.validation?.[sym];
    let healthStatus = '✅ Clean';
    if (v?.status === 'RED') healthStatus = '🔴 RISK';
    else if (v?.status === 'AMBER') healthStatus = '⚠️ Warning';

    const strategy = h.Strategy || h.strategy || '';
    const reasoning = [strategy, v?.reason].filter(Boolean).join(' | ');

    return {
      symbol: sym,
      assetClass: h['Asset Class'] || h.assetClass || '—',
      weight: Number(h['Weight (%)'] ?? h.weight ?? 0),
      healthStatus,
      reasoning: reasoning || '—',
      isRisk: v?.status === 'RED',
      isWarning: v?.status === 'AMBER',
    };
  });
}

const thStyle = {
  padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800,
  color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '10px 12px', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'top',
};

export default function ProfileTab({ handle, persona, setPersona, onOnboardingComplete, onNavigate }) {
  const [step, setStep] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [scores, setScores] = useState({ q1: null, q2: null, q3: null });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [brands, setBrands] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [category, setCategory] = useState('Nifty 50');
  const [brandSearch, setBrandSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [smartResult, setSmartResult] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [portfolioSaved, setPortfolioSaved] = useState(false);
  const [pickedBrandsList, setPickedBrandsList] = useState([]);
  const { showLoader, updateLoader, hideLoader, loading: generating } = useLoader();
  const { showAlert, showConfirm } = useCommandModal();
  const isMobile = useIsMobile();
  const swarmSize = isMobile ? 196 : 240;

  const refresh = async () => {
    try {
      const { data } = await profileApi.get(handle);
      setPersona(data.persona || 'Not Set');
      setStatus(data.status);
      setPortfolioSaved(data.status?.onboarding_complete === true);
      if (data.profile?.brands) setSelectedBrands(new Set(data.profile.brands));
      if (data.profile?.scores) setScores({ q1: null, q2: null, q3: null, ...data.profile.scores });

      if (data.status?.onboarding_complete) {
        setStep(4);
      } else if (data.persona && data.persona !== 'Not Set' && data.profile?.brands?.length) {
        setStep(3);
      } else if (data.persona && data.persona !== 'Not Set') {
        setStep(2);
      } else {
        setStep(0);
      }
    } catch (e) {
      console.error('Profile refresh failed:', e);
      setStep((current) => (current == null ? 0 : current));
    }
  };

  useEffect(() => { refresh(); }, [handle]);

  useEffect(() => {
    if (step == null || step < 4 || !persona || persona === 'Not Set' || !portfolioSaved) return;
    const pfName = `Smart ${persona} Portfolio`;
    if (!smartResult) {
      (async () => {
        try {
          const { data } = await portfolioApi.get(handle, pfName);
          if (!data?.holdings?.length) return;
          let validation = {};
          try {
            const { data: prof } = await profileApi.get(handle);
            validation = prof.profile?.last_validation || {};
          } catch {
            /* use validate endpoint fallback */
          }
          if (!Object.keys(validation).length) {
            try {
              const { data: v } = await profileApi.validateHoldings(data.holdings);
              validation = v.validation || {};
            } catch {
              /* non-fatal */
            }
          }
          setSmartResult({ saved_portfolio: pfName, holdings: data.holdings, validation, persona });
        } catch {
          /* non-fatal */
        }
      })();
    }
    if (!simulation) {
      profileApi.simulation(handle, pfName).then((r) => setSimulation(r.data)).catch(() => {});
    }
  }, [step, smartResult, simulation, persona, handle, portfolioSaved]);

  useEffect(() => {
    profileApi.brands(category).then((r) => {
      setBrands(r.data.brands || []);
      setSectors(r.data.sectors || []);
      setSectorFilter('All');
      setBrandSearch('');
    });
  }, [category]);

  useEffect(() => {
    if (step !== 3 || selectedBrands.size === 0) {
      setPickedBrandsList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const responses = await Promise.all(
          ['Nifty 50', 'Nifty Next 50', 'Midcap'].map((c) => profileApi.brands(c)),
        );
        if (cancelled) return;
        const byTicker = new Map();
        responses.forEach(({ data }) => (data.brands || []).forEach((b) => byTicker.set(b.ticker, b)));
        setPickedBrandsList(
          [...selectedBrands].map((ticker) => byTicker.get(ticker) || {
            ticker,
            ticker_short: ticker.split('.')[0],
            name: ticker.split('.')[0],
            logo: null,
          }),
        );
      } catch {
        if (!cancelled) {
          setPickedBrandsList(
            [...selectedBrands].map((ticker) => ({
              ticker,
              ticker_short: ticker.split('.')[0],
              name: ticker.split('.')[0],
              logo: null,
            })),
          );
        }
      }
    })();
    return () => { cancelled = true; };
  }, [step, selectedBrands]);

  const submitQuiz = async (finalScores) => {
    setSubmitting(true);
    try {
      const { data } = await profileApi.analyze({ ...finalScores, user_handle: handle });
      setPersona(data.persona);
      setScores(data.scores);
      setSelectedBrands(new Set());
      setSmartResult(null);
      setSimulation(null);
      setPortfolioSaved(false);
      setStep(2);
      setQuizIndex(0);
    } catch (e) {
      showAlert(e.response?.data?.error || 'Quiz submission failed. Is the backend running on port 8080?', {
        variant: 'error',
        title: 'Quiz failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = (q, choice) => {
    if (submitting) return;
    setScores((prev) => ({ ...prev, [q.key]: choice.score }));
  };

  const goNextQuestion = () => {
    const q = QUIZ[quizIndex];
    if (scores[q.key] == null || submitting) return;
    if (quizIndex < QUIZ.length - 1) {
      setQuizIndex((i) => i + 1);
    } else {
      submitQuiz(scores);
    }
  };

  const goToQuiz = (keepScores = true) => {
    if (!keepScores) {
      setScores({ q1: null, q2: null, q3: null });
    }
    setQuizIndex(0);
    setStep(1);
  };

  const startOver = async () => {
    const ok = await showConfirm(
      'This clears your quiz, brand picks, and smart portfolio progress.',
      {
        title: 'Start over?',
        variant: 'danger',
        confirmLabel: 'Start over',
        cancelLabel: 'Keep progress',
      },
    );
    if (!ok) return;
    try {
      await profileApi.reset(handle);
      setScores({ q1: null, q2: null, q3: null });
      setSelectedBrands(new Set());
      setQuizIndex(0);
      setStep(0);
      setPersona('Not Set');
      setSmartResult(null);
      setSimulation(null);
      setPortfolioSaved(false);
    } catch (e) {
      showAlert(e.response?.data?.error || 'Could not reset profile.', {
        variant: 'error',
        title: 'Reset failed',
      });
    }
  };

  const navBtn = {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  const STEP_LABELS = [
    { full: 'Sleep Test', short: 'Intro' },
    { full: 'Brand Shop', short: 'Brands' },
    { full: 'Smart Portfolio', short: 'Portfolio' },
    { full: 'Complete', short: 'Done' },
  ];
  const activePill = step == null ? 0 : Math.min(step === 0 ? 0 : step - 1, 3);
  const stepProgress = ((activePill + 1) / STEP_LABELS.length) * 100;
  const stepMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.22 },
  };

  useEffect(() => {
    if (step == null) return;
    const active = document.querySelector('.profile-stepper__pill--active');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [step, activePill]);

  const filteredBrands = brands.filter((b) => {
    if (!b || !b.ticker) return false;
    const q = brandSearch.trim().toLowerCase();
    const matchesSearch = !q
      || b.ticker.toLowerCase().includes(q)
      || (b.name || '').toLowerCase().includes(q);
    const matchesSector = sectorFilter === 'All' || b.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const toggleBrand = (ticker) => {
    const limit = PERSONA_MAX_BRANDS[persona] || 6;
    setSelectedBrands((s) => {
      const n = new Set(s);
      if (n.has(ticker)) {
        n.delete(ticker);
      } else if (n.size >= limit) {
        showAlert(
          `Your ${persona} strategy supports up to ${limit} brand picks. Remove one to add another.`,
          { variant: 'warning', title: 'Selection limit' },
        );
        return s;
      } else {
        n.add(ticker);
      }
      return n;
    });
  };

  const jumpToStep = (pillIndex) => {
    if (pillIndex === 0) {
      if (persona && persona !== 'Not Set') goToQuiz(true);
      else { setStep(0); setQuizIndex(0); }
      return;
    }
    if (pillIndex === 1 && persona && persona !== 'Not Set') setStep(2);
    if (pillIndex === 2 && selectedBrands.size > 0) setStep(3);
    if (pillIndex === 3 && (status?.onboarding_complete || smartResult)) setStep(4);
  };

  const saveBrands = async () => {
    try {
      await profileApi.save({
        user_handle: handle,
        persona,
        brands: [...selectedBrands],
        scores,
        onboarding_complete: false,
      });
      setStep(3);
    } catch (e) {
      showAlert(e.response?.data?.error || 'Could not save your selections. Is the backend running?', {
        variant: 'error',
        title: 'Save failed',
      });
    }
  };

  const generateSmart = async () => {
    showLoader(`Building your ${persona} smart portfolio with AI...`);
    try {
      const { data } = await profileApi.smartPortfolio({
        user_handle: handle,
        brands: [...selectedBrands],
        save: false,
      });
      setSmartResult(data);
      setSimulation(null);
      setPortfolioSaved(false);
      setStep(4);
    } catch (e) {
      showAlert(e.response?.data?.error || 'Smart portfolio generation failed. Is the backend running?', {
        variant: 'error',
        title: 'Generation failed',
      });
    } finally {
      hideLoader();
    }
  };

  const saveAndInitialize = async () => {
    showLoader('Saving portfolio and initializing...');
    try {
      const { data } = await profileApi.smartPortfolio({
        user_handle: handle,
        brands: [...selectedBrands],
        save: true,
      });
      setSmartResult(data);
      setPortfolioSaved(true);
      updateLoader('Running historical simulation vs Nifty 50...');
      const sim = await profileApi.simulation(handle, data.saved_portfolio);
      setSimulation(sim.data);
      await profileApi.completeOnboarding(handle);
      onOnboardingComplete?.();
    } catch (e) {
      showAlert(e.response?.data?.error || 'Could not save portfolio. Is the backend running?', {
        variant: 'error',
        title: 'Save failed',
      });
    } finally {
      hideLoader();
    }
  };


  const activePersona = personaInfo(persona);
  const portfolioRows = enrichHoldings(smartResult);
  const totalWeight = portfolioRows.reduce((sum, r) => sum + r.weight, 0);
  const answers = quizAnswers(scores);
  const cleanHoldings = portfolioRows.filter((r) => !r.isRisk && !r.isWarning).length;

  if (step == null) {
    return (
      <PageShell>
        <div className="ah-tab-fallback">
          <HiveLoader size={44} />
          <p>Loading investor profile…</p>
        </div>
      </PageShell>
    );
  }

  const stepIndex = Math.max(0, Math.min(step - 1, STEP_LABELS.length - 1));
  const stepLabel = step === 0 ? 'Intro' : (STEP_LABELS[stepIndex]?.full ?? '—');

  const profilePulseItems = [
    { label: 'Persona', value: persona === 'Not Set' ? 'Pending' : persona.replace('The ', '') },
    { label: 'Brands', value: selectedBrands.size || '—' },
    { label: 'Step', value: stepLabel },
    ...(portfolioRows.length ? [{ label: 'Holdings', value: portfolioRows.length }] : []),
    ...(portfolioSaved ? [{ label: 'Status', value: 'Active' }] : []),
  ];

  const heroVisual = step >= 4 || (persona && persona !== 'Not Set')
    ? <AgentSwarm size={swarmSize} pulse={!generating} />
    : <AgentSwarm size={isMobile ? 176 : 200} pulse={step > 0} />;

  return (
    <PageShell>
      <Surface glow className="mission-briefing">
        <div className="mission-briefing__head">
          <Eyebrow>Investor profile briefing</Eyebrow>
          <span className="mission-briefing__live"><span className="live-dot" /> {portfolioSaved ? 'Active' : step >= 4 ? 'Preview' : 'In progress'}</span>
        </div>
        <p className="mission-briefing__text">
          {persona && persona !== 'Not Set' ? (
            <>Your <strong>{persona}</strong> persona {personaEmoji(persona)} is calibrated with{' '}
              <strong>{selectedBrands.size || 0}</strong> brand picks
              {portfolioRows.length > 0 && <> and <strong>{portfolioRows.length}</strong> AI-validated holdings</>}.
              {portfolioSaved ? ' Smart portfolio saved and synced.' : step >= 4 ? ' Review and save to activate.' : ' Complete the Sleep Test flow to unlock your swarm.'}</>
          ) : (
            <>Complete the <strong>Sleep Test</strong> to map your risk DNA, pick trusted brands, and generate a persona-matched smart portfolio.</>
          )}
        </p>
      </Surface>

      <MarketPulseStrip items={profilePulseItems} />

      {step >= 4 && persona && persona !== 'Not Set' ? (
        <HeroBanner
          eyebrow={`${greeting()} · Investor Profile`}
          title={<>Your <span className="gradient-text-animated">{persona.replace('The ', '')}</span> strategy is live</>}
          subtitle={`${portfolioRows.length || selectedBrands.size} picks aligned to ${persona} ${personaEmoji(persona)} — forensic checks, smart weights, benchmark simulation.`}
          stats={[
            { label: 'Holdings', value: <AnimatedCounter value={portfolioRows.length || 0} />, accent: activePersona?.color || 'var(--accent-cyan)' },
            { label: 'Allocation', value: `${totalWeight.toFixed(0)}%`, accent: Math.abs(totalWeight - 100) <= 0.1 ? 'var(--accent-emerald)' : 'var(--accent-amber)' },
            { label: 'Brands', value: <AnimatedCounter value={selectedBrands.size} />, accent: 'var(--accent-blue)' },
            { label: 'Health', value: portfolioRows.length ? `${cleanHoldings}/${portfolioRows.length}` : '—', accent: 'var(--accent-purple)' },
          ]}
          actions={(
            <>
              <Button variant="ghost" onClick={() => goToQuiz(true)}><RotateCcw size={16} /> Retake Sleep Test</Button>
              <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft size={16} /> Edit Brands</Button>
              {!portfolioSaved && smartResult && (
                <Button onClick={saveAndInitialize} disabled={generating}><Save size={16} /> Save Portfolio</Button>
              )}
              {portfolioSaved && onNavigate && (
                <Button onClick={() => onNavigate('portfolio')}><Briefcase size={16} /> View Portfolio</Button>
              )}
              <Button variant="ghost" onClick={startOver} style={{ color: 'var(--accent-red)' }}>Start Over</Button>
            </>
          )}
          visual={heroVisual}
        />
      ) : (
        <HeroBanner
          eyebrow={`${greeting()} · ${step === 0 ? 'Sleep Test' : step === 1 ? `Quiz · ${quizIndex + 1}/3` : step === 2 ? 'Brand Shop' : 'Smart Portfolio'}`}
          title={(
            step === 0 ? <>Discover your <span className="gradient-text-animated">investor persona</span></>
              : step === 1 ? QUIZ[quizIndex].question
              : step === 2 ? <>Pick brands you <span className="gradient-text-animated">trust</span></>
              : <>Build your <span className="gradient-text-animated">smart portfolio</span></>
          )}
          subtitle={(
            step === 0 ? 'Three honesty-based questions calibrate your agentic strategy and unlock persona-matched allocations.'
              : step === 1 ? QUIZ[quizIndex].label
              : step === 2 ? `${persona} · up to ${PERSONA_MAX_BRANDS[persona] || 6} core picks from Nifty indices`
              : 'AI validates holdings with forensic, shadow, and correlation checks before you save.'
          )}
          stats={[
            { label: 'Persona', value: persona === 'Not Set' ? '—' : persona.replace('The ', ''), accent: activePersona?.color || 'var(--accent-cyan)' },
            { label: 'Brands', value: selectedBrands.size || '—', accent: 'var(--accent-blue)' },
            { label: 'Step', value: stepLabel, accent: 'var(--accent-purple)' },
            { label: 'Max picks', value: PERSONA_MAX_BRANDS[persona] || '—', accent: 'var(--accent-emerald)' },
          ]}
          actions={step === 0 ? (
            <Button onClick={() => { setStep(1); setQuizIndex(0); setScores({ q1: null, q2: null, q3: null }); }}>
              <Sparkles size={16} /> Begin Sleep Test
            </Button>
          ) : null}
          visual={heroVisual}
        />
      )}

      <div className="profile-stepper-wrap">
        <div className="profile-stepper__progress" aria-hidden>
          <div className="profile-stepper__progress-fill" style={{ width: `${stepProgress}%` }} />
        </div>
        <div className="profile-stepper" role="tablist" aria-label="Onboarding steps">
          {STEP_LABELS.map((s, i) => {
            const visited = step >= 4 ? true : step === 0 ? i === 0 : step - 1 >= i;
            const isActive = activePill === i;
            return (
              <button
                key={s.full}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => visited && jumpToStep(i)}
                disabled={!visited}
                className={`profile-stepper__pill${isActive ? ' profile-stepper__pill--active' : visited ? ' profile-stepper__pill--visited' : ' profile-stepper__pill--locked'}`}
              >
                <span className="profile-stepper__num">{i + 1}</span>
                <span className="profile-stepper__label--long">{s.full}</span>
                <span className="profile-stepper__label--short">{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="sync">
        {step <= 1 && (
          <motion.div key="quiz" {...stepMotion}>
            {step === 0 && (
              <GlassCard style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  Use <strong style={{ color: 'var(--accent-cyan)' }}>Begin Sleep Test</strong> above to start the 3-question calibration.
                </p>
              </GlassCard>
            )}
            {step === 1 && (() => {
              const q = QUIZ[quizIndex];
              const selected = scores[q.key];
              return (
                <GlassCard className="profile-quiz-card">
                  <p style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 800, letterSpacing: 1 }}>{q.label}</p>
                  <h4 style={{ margin: '0.75rem 0 1.5rem', color: '#cbd5e1', fontSize: 'clamp(1rem, 4vw, 1.1rem)', lineHeight: 1.5 }}>{q.question}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.choices.map((c) => {
                      const isSelected = selected === c.score;
                      return (
                        <button
                          key={c.text}
                          type="button"
                          disabled={submitting}
                          onClick={() => selectAnswer(q, c)}
                          style={{
                            padding: '1rem 1.2rem',
                            textAlign: 'left',
                            borderRadius: 12,
                            border: isSelected ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.12)',
                            background: isSelected ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: submitting ? 'wait' : 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.95rem',
                            transition: 'all 0.15s ease',
                            pointerEvents: 'auto',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        >
                          {c.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="profile-quiz-nav">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => quizIndex === 0 ? setStep(0) : setQuizIndex((i) => Math.max(0, i - 1))}
                      style={{ ...navBtn, opacity: submitting ? 0.5 : 1, minHeight: 44 }}
                    >
                      <ChevronLeft size={14} /> {quizIndex === 0 ? 'Cancel' : 'Back'}
                    </button>
                    <span className="profile-quiz-nav__progress">Question {quizIndex + 1} of {QUIZ.length}</span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button
                        type="button"
                        disabled={submitting || selected == null}
                        onClick={goNextQuestion}
                        style={{
                          ...navBtn,
                          minHeight: 44,
                          color: selected != null ? '#22d3ee' : '#475569',
                          borderColor: selected != null ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.12)',
                          opacity: selected != null ? 1 : 0.6,
                        }}
                      >
                        {quizIndex === QUIZ.length - 1 ? 'Finish' : 'Next'} →
                      </button>
                    </div>
                  </div>
                  {submitting && <p style={{ marginTop: '1rem', color: '#06b6d4', textAlign: 'center' }}>Calibrating your persona...</p>}
                </GlassCard>
              );
            })()}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="brands" {...stepMotion}>
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                <button type="button" onClick={() => goToQuiz(true)} style={navBtn}>
                  <ChevronLeft size={14} /> Edit Quiz Answers
                </button>
                <button type="button" onClick={startOver} style={{ ...navBtn, color: '#f43f5e', borderColor: 'rgba(244,63,94,0.25)' }}>
                  <RotateCcw size={14} /> Start Over
                </button>
              </div>
              <p style={{ marginBottom: '0.35rem', color: '#94a3b8' }}>Pick brands you trust — <strong style={{ color: '#22d3ee' }}>{persona}</strong></p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                Select up to <strong style={{ color: '#22d3ee' }}>{PERSONA_MAX_BRANDS[persona] || 6}</strong> stocks for your portfolio.
                {scores.q1 != null && (
                  <> Tap <strong style={{ color: '#22d3ee' }}>Edit Quiz Answers</strong> to change any question.</>
                )}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1rem', alignItems: 'center' }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, background: '#0f172a', color: 'white', border: '1px solid #334155', minWidth: 140 }}
                >
                  {['Nifty 50', 'Nifty Next 50', 'Midcap'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search ticker or company..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', color: 'white',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: 700 }}>
                  {selectedBrands.size} selected
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
                {['All', ...sectors].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSectorFilter(s)}
                    style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      border: sectorFilter === s ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      background: sectorFilter === s ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.03)',
                      color: sectorFilter === s ? '#22d3ee' : '#94a3b8',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div
                className="mr-scroll"
                style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                gap: 10,
                maxHeight: 420,
                overflowY: 'auto',
                padding: '4px 6px 4px 2px',
              }}>
                {filteredBrands.map((b) => {
                  const selected = selectedBrands.has(b.ticker);
                  return (
                    <button
                      key={b.ticker}
                      type="button"
                      onClick={() => toggleBrand(b.ticker)}
                      style={{
                        position: 'relative',
                        padding: '12px',
                        borderRadius: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: selected ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                        background: selected ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                        color: 'white',
                        boxShadow: selected ? '0 4px 18px rgba(6,182,212,0.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selected && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%',
                          background: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check size={12} color="#000" strokeWidth={3} />
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <img
                          src={b.logo}
                          alt={b.ticker_short || b.ticker}
                          style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                            {b.ticker_short || b.ticker.split('.')[0]}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 2 }}>{b.sector}</div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        color: '#cbd5e1',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {b.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredBrands.length === 0 && (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>No brands match your search.</p>
              )}

              {selectedBrands.size > 0 && (
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '0.75rem', gap: 12,
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                      Selected stocks
                    </span>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, color: '#06b6d4',
                      background: 'rgba(6,182,212,0.12)', padding: '4px 10px', borderRadius: 999,
                      border: '1px solid rgba(6,182,212,0.2)',
                    }}>
                      {selectedBrands.size}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[...selectedBrands].map((ticker) => {
                      const meta = brands.find((b) => b.ticker === ticker);
                      const label = meta?.ticker_short || ticker.split('.')[0];
                      return (
                        <div
                          key={ticker}
                          title={meta?.name || label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '5px 8px 5px 5px',
                            borderRadius: 999,
                            background: 'rgba(6,182,212,0.1)',
                            border: '1px solid rgba(6,182,212,0.28)',
                          }}
                        >
                          {meta?.logo ? (
                            <img
                              src={meta.logo}
                              alt={label}
                              style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: 'rgba(255,255,255,0.08)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8',
                            }}>
                              {label.slice(0, 2)}
                            </div>
                          )}
                          <span style={{
                            fontSize: '0.76rem', fontWeight: 800, color: '#f1f5f9',
                            fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
                          }}>
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleBrand(ticker)}
                            aria-label={`Remove ${label}`}
                            style={{
                              width: 22, height: 22, marginLeft: 2,
                              borderRadius: '50%', border: 'none', cursor: 'pointer',
                              background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
                    Tap × or click the stock again in the grid to remove
                  </p>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={saveBrands}
                disabled={selectedBrands.size < 1}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: selectedBrands.size < 1 ? '#334155' : '#06b6d4',
                  color: selectedBrands.size < 1 ? '#64748b' : '#000',
                  fontWeight: 800, cursor: selectedBrands.size < 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Continue ({selectedBrands.size} selected)
              </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="smart" {...stepMotion}>
            <GlassCard style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setStep(2)} style={navBtn}>
                  <ChevronLeft size={14} /> Back to Brand Shop
                </button>
                <button type="button" onClick={() => goToQuiz(true)} style={navBtn}>
                  <RotateCcw size={14} /> Retake Quiz
                </button>
              </div>
              <h3>Generate Smart Portfolio</h3>
              <p style={{ color: '#94a3b8', margin: '1rem 0 0' }}>AI will build and validate holdings from your brand picks.</p>

              {selectedBrands.size > 0 && (
                <div style={{
                  margin: '1.5rem auto 1.75rem',
                  maxWidth: 640,
                  padding: '1rem 1.25rem',
                  borderRadius: 14,
                  background: 'rgba(6,182,212,0.06)',
                  border: '1px solid rgba(6,182,212,0.18)',
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem' }}>
                    YOUR BRAND PICKS ({selectedBrands.size})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {pickedBrandsList.map((b) => {
                      const label = b.ticker_short || b.ticker?.split('.')[0];
                      return (
                        <span
                          key={b.ticker}
                          title={b.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '5px 12px 5px 5px',
                            borderRadius: 999,
                            background: 'rgba(6,182,212,0.1)',
                            border: '1px solid rgba(6,182,212,0.28)',
                          }}
                        >
                          {b.logo ? (
                            <img
                              src={b.logo}
                              alt={label}
                              style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0 }}
                            />
                          ) : (
                            <span style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: 'rgba(255,255,255,0.08)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8',
                            }}>
                              {label?.slice(0, 2)}
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.76rem', fontWeight: 800, color: '#f1f5f9',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            {label}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 12, marginBottom: 0 }}>
                    Wrong picks?{' '}
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: '#22d3ee', fontWeight: 700, fontSize: 'inherit',
                      }}
                    >
                      Edit in Brand Shop
                    </button>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={generateSmart}
                disabled={generating}
                style={{
                  padding: '1rem 2rem', borderRadius: 14, border: 'none',
                  background: generating ? '#334155' : 'linear-gradient(45deg,#10b981,#06b6d4)',
                  color: 'white', fontWeight: 800,
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating ? 0.8 : 1,
                }}
              >
                {generating ? 'Building portfolio...' : `Build Smart ${persona} Portfolio`}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {step >= 4 && (
          <motion.div key="done" {...stepMotion}>
            {activePersona && (
              <div className="mission-grid mission-grid--metrics" style={{ marginBottom: '1.25rem' }}>
                {answers.map((a) => (
                  <InsightCard
                    key={a.label}
                    icon={<Shield size={18} />}
                    title={a.label}
                    value={a.answer}
                    hint={a.question}
                    accent={activePersona.color}
                  />
                ))}
              </div>
            )}

            {selectedBrands.size > 0 && (
              <Surface className="mission-watchlist" style={{ marginBottom: '1.25rem' }}>
                <div className="mission-watchlist__head">
                  <Sparkles size={16} />
                  <Eyebrow style={{ margin: 0 }}>Brands you trust</Eyebrow>
                </div>
                <div className="mission-watchlist__scroll mr-scroll">
                  {[...selectedBrands].map((t) => (
                    <span key={t} className="watch-chip">
                      <span className="watch-chip__sym">{t.split('.')[0]}</span>
                      <span className="watch-chip__str">{persona.replace('The ', '')}</span>
                    </span>
                  ))}
                </div>
              </Surface>
            )}

            {smartResult && portfolioRows.length > 0 && (
              <GlassCard style={{ marginBottom: '1rem' }}>
                <SectionHeader
                  eyebrow="AI Portfolio"
                  icon={<TrendingUp size={18} color="var(--accent-emerald)" />}
                  title="Your Custom Holdings"
                  sub={portfolioSaved && smartResult.saved_portfolio ? `Saved as ${smartResult.saved_portfolio}` : 'Preview — save to activate'}
                />
                <div className="mr-table-scroll" style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={thStyle}>Symbol</th>
                        <th style={thStyle}>Asset Class</th>
                        <th style={thStyle}>Weight (%)</th>
                        <th style={thStyle}>Health Status</th>
                        <th style={{ ...thStyle, minWidth: 160 }}>AI Reasoning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioRows.map((row) => (
                        <tr key={row.symbol}>
                          <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{row.symbol}</td>
                          <td style={tdStyle}>{row.assetClass}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{row.weight.toFixed(1)}%</td>
                          <td style={{
                            ...tdStyle,
                            color: row.isRisk ? '#f43f5e' : row.isWarning ? '#fbbf24' : '#10b981',
                            fontWeight: 700,
                          }}>
                            {row.healthStatus}
                          </td>
                          <td style={{ ...tdStyle, color: '#94a3b8', minWidth: 160, whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  marginTop: '1rem', padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
                  background: Math.abs(totalWeight - 100) <= 0.1 ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.12)',
                  color: Math.abs(totalWeight - 100) <= 0.1 ? '#10b981' : '#fbbf24',
                  border: `1px solid ${Math.abs(totalWeight - 100) <= 0.1 ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
                }}>
                  {Math.abs(totalWeight - 100) <= 0.1
                    ? `✅ Total Allocation: ${totalWeight.toFixed(1)}%`
                    : `⚠️ Total Weight is ${totalWeight.toFixed(1)}%. Recommended: 100%.`}
                </div>

                {portfolioSaved ? (
                  <div style={{
                    marginTop: '1rem', padding: '12px 16px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.12)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Check size={18} strokeWidth={3} /> Saved Successfully!
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={saveAndInitialize}
                    disabled={generating}
                    style={{
                      marginTop: '1rem', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(139,92,246,0.4)',
                      background: 'rgba(255,255,255,0.04)', color: 'white', fontWeight: 800,
                      cursor: generating ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Save size={16} /> Save Portfolio & Initialize
                  </button>
                )}
              </GlassCard>
            )}

            {portfolioSaved && simulation && !simulation.error && (
              <GlassCard>
                <SectionHeader
                  eyebrow="Benchmark"
                  icon={<Activity size={18} color="var(--accent-emerald)" />}
                  title="Historical Performance Simulation"
                  sub="1-year backtest vs Nifty 50"
                />
                {simulation.series && (
                  <div style={{ marginBottom: '1.25rem', padding: '12px', borderRadius: 12, background: 'rgba(0,0,0,0.2)' }}>
                    <SimulationChart series={simulation.series} />
                  </div>
                )}
                <div className="mission-grid mission-grid--metrics">
                  <InsightCard
                    icon={<TrendingUp size={18} />}
                    title="Portfolio return"
                    value={`${simulation.portfolio_return_1y_pct}%`}
                    hint={simulation.delta_vs_index_pct != null ? `${simulation.delta_vs_index_pct >= 0 ? '↑' : '↓'} ${Math.abs(simulation.delta_vs_index_pct)}% vs index` : undefined}
                    accent={simulation.portfolio_return_1y_pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)'}
                  />
                  <InsightCard
                    icon={<Shield size={18} />}
                    title="Benchmark return"
                    value={`${simulation.benchmark_return_1y_pct}%`}
                    hint={simulation.benchmark || 'Nifty 50'}
                    accent="var(--text-secondary)"
                  />
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
