import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Briefcase, Eye, History, TrendingUp, AlertTriangle,
  Sparkles, BarChart2, Shield, Zap, ArrowRight, Brain, Calendar,
} from 'lucide-react';
import { GlassCard, SectionHeader, EmptyState } from '../components/Shared';
import {
  AgentSwarm, AgentActivityFeed, HeroBanner, InsightCard,
  QuickAction, PageShell, AGENTS,
} from '../components/AIExperience';
import {
  DailyBriefing, MarketPulseStrip, SectorHeatStrip,
  WatchlistRail, AnimatedCounter,
} from '../components/MissionControl';
import { PullToRefreshHint } from '../components/ui/mobile';
import { Button } from '../components/ui/primitives';
import { useIsMobile } from '../hooks/useMediaQuery';
import { normalizeSectorList, deriveShadowSummary, displayValue } from '../utils/marketNormalize';
import {
  profileApi, portfolioApi, forecastApi, shadowApi, healthApi, brainApi,
} from '../api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function personaEmoji(persona) {
  if (persona?.includes('Hunter')) return '🦅';
  if (persona?.includes('Defender')) return '🛡️';
  if (persona?.includes('Preserver')) return '🌱';
  return '🚀';
}

export default function HomeTab({ handle, persona, onNavigate }) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [shadow, setShadow] = useState(null);
  const [health, setHealth] = useState(null);
  const [agentCount, setAgentCount] = useState(0);
  const [sectorFlow, setSectorFlow] = useState([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [prof, pf, fc, sh, hl, agents, flow] = await Promise.allSettled([
        profileApi.get(handle),
        portfolioApi.list(handle),
        forecastApi.list(handle, true),
        shadowApi.market(),
        healthApi.overview(),
        brainApi.agents(),
        shadowApi.sectorFlow(),
      ]);

      if (prof.status === 'fulfilled') setProfile(prof.value.data);
      if (pf.status === 'fulfilled') setPortfolios(pf.value.data.portfolios || []);
      if (fc.status === 'fulfilled') setForecasts((fc.value.data.forecasts || fc.value.data.items || []).slice(0, 8));
      if (sh.status === 'fulfilled') setShadow(sh.value.data);
      if (hl.status === 'fulfilled') setHealth(hl.value.data);
      if (agents.status === 'fulfilled') setAgentCount((agents.value.data.agents || []).length);
      if (flow.status === 'fulfilled') {
        const sectors = flow.value.data?.sectors || flow.value.data?.flow || [];
        setSectorFlow(normalizeSectorList(Array.isArray(sectors) ? sectors : []));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handle]);

  useEffect(() => { load(); }, [load]);

  const shadowSummary = useMemo(() => deriveShadowSummary(shadow), [shadow]);
  const marketMood = shadowSummary.mood;
  const intent = shadowSummary.intent;
  const activityItems = shadowSummary.activityItems;
  const successRate = health?.success_rate_pct;
  const portfolioCount = portfolios.length;
  const forecastCount = forecasts.length;
  const moduleCount = AGENTS.length;
  const normalizedSectors = sectorFlow;

  const pulseItems = useMemo(() => {
    const items = [
      { label: 'Health', value: successRate != null ? `${successRate}%` : '—' },
      { label: 'Platform agents', value: agentCount || '—' },
      { label: 'Analysis modules', value: moduleCount },
      { label: 'Forecasts', value: forecastCount || '—' },
    ];
    if (marketMood) items.unshift({ label: 'Shadow', value: String(marketMood).slice(0, 18) });
    if (intent) items.splice(marketMood ? 1 : 0, 0, { label: 'Intent', value: intent });
    return items;
  }, [marketMood, intent, successRate, agentCount, moduleCount, forecastCount]);

  const opportunities = useMemo(() => {
    const items = [];
    normalizedSectors.forEach((s, i) => {
      const flow = s.flow;
      items.push({
        id: `sector-${i}`,
        label: s.sector,
        detail: typeof flow === 'number'
          ? `Momentum ${flow >= 0 ? '+' : ''}${flow.toFixed(1)}`
          : (s.trend || 'Sector rotation'),
        accent: typeof flow === 'number' && flow < 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
      });
    });
    forecasts.slice(0, 3).forEach((f, i) => {
      items.push({
        id: `fc-${i}`,
        label: (f.ticker || f.symbol || 'Ticker').replace(/\.(NS|BO)$/i, ''),
        detail: f.strategy ? `${f.strategy} · ₹${Number(f.target_price || 0).toFixed(0)}` : 'Tracked forecast',
        accent: 'var(--accent-blue)',
      });
    });
    return items.slice(0, 6);
  }, [normalizedSectors, forecasts]);

  const riskAlerts = useMemo(() => {
    const alerts = [];
    if (intent && String(intent).toUpperCase().includes('DISTRIB')) {
      alerts.push({ id: 'intent', msg: 'Institutional distribution — smart money may be exiting.', level: 'high' });
    }
    if (health?.error_count > 0) {
      alerts.push({ id: 'err', msg: `${health.error_count} workflow errors in the last 24h.`, level: 'medium' });
    }
    if (profile?.status && !profile.status.onboarding_complete) {
      alerts.push({ id: 'onboard', msg: 'Complete investor profile to unlock full swarm.', level: 'low' });
    }
    return alerts;
  }, [intent, health, profile]);

  const hasBriefingData = Boolean(marketMood || intent || shadowSummary.signalCount > 0);

  return (
    <PageShell>
      <PullToRefreshHint refreshing={refreshing} onRefresh={() => load(true)} />

      <DailyBriefing
        persona={persona}
        marketMood={marketMood}
        intent={intent}
        agentCount={agentCount}
        moduleCount={moduleCount}
        hasData={hasBriefingData}
      />

      <MarketPulseStrip items={pulseItems} />

      <HeroBanner
        eyebrow={`${greeting()} · Mission Control`}
        title={<>Your AI swarm owns <span className="gradient-text-animated">today&apos;s market</span></>}
        subtitle={`${agentCount || 0} platform agents · ${moduleCount} analysis modules · ${persona || 'your'} persona ${personaEmoji(persona)}`}
        stats={[
          { label: 'Modules', value: <AnimatedCounter value={moduleCount} />, accent: 'var(--accent-blue)' },
          { label: 'Platform', value: agentCount ? <AnimatedCounter value={agentCount} /> : '—', accent: 'var(--accent-violet)' },
          { label: 'System', value: successRate != null ? <AnimatedCounter value={successRate} suffix="%" /> : '—', accent: 'var(--accent-emerald)' },
          { label: 'Portfolios', value: <AnimatedCounter value={portfolioCount} />, accent: 'var(--accent-cyan)' },
        ]}
        actions={(
          <>
            <Button onClick={() => onNavigate('dashboard')}><BarChart2 size={16} /> Analyze</Button>
            <Button variant="ghost" onClick={() => onNavigate('brain')}><Brain size={16} /> Agent brain</Button>
          </>
        )}
        visual={<AgentSwarm size={isMobile ? 200 : 240} pulse={!loading} />}
      />

      <SectorHeatStrip sectors={normalizedSectors} onNavigate={onNavigate} />

      <div className="mission-grid mission-grid--metrics">
        <InsightCard icon={<TrendingUp size={18} />} title="Shadow signals" value={displayValue(marketMood)} hint={intent ? `Intent: ${intent}` : 'Run analysis for intent'} accent="var(--accent-emerald)" onClick={() => onNavigate('shadow')} />
        <InsightCard icon={<Shield size={18} />} title="Portfolio health" value={portfolioCount ? `${portfolioCount} active` : 'None saved'} hint={persona} accent="var(--accent-indigo)" onClick={() => onNavigate('portfolio')} />
        <InsightCard icon={<History size={18} />} title="Forecasts" value={forecastCount || '—'} hint="Saved scenarios" accent="var(--accent-violet)" onClick={() => onNavigate('forecasts')} />
        <InsightCard icon={<Eye size={18} />} title="Smart money" value={displayValue(intent)} hint={shadowSummary.signalCount ? `${shadowSummary.signalCount} DB signals` : 'Open Shadow Tracker'} accent="var(--accent-rose)" onClick={() => onNavigate('shadow')} />
      </div>

      <WatchlistRail forecasts={forecasts} onNavigate={onNavigate} />

      <div className="mission-grid mission-grid--dual">
        <GlassCard style={{ padding: '1.35rem' }}>
          <SectionHeader eyebrow="Live" icon={<Activity size={18} color="var(--accent-blue)" />} title="Agent activity" sub="Continuous multi-agent reasoning." />
          {loading ? (
            <div className="mission-skeleton">
              <div className="mr-skeleton" style={{ height: 52 }} />
              <div className="mr-skeleton" style={{ height: 52 }} />
              <div className="mr-skeleton" style={{ height: 52 }} />
            </div>
          ) : activityItems.length === 0 ? (
            <EmptyState
              icon={<Activity size={24} />}
              title="No agent activity yet"
              description="Run market analysis or open Shadow Tracker to populate live signals from your database."
              action={<Button onClick={() => onNavigate('dashboard')}>Analyze <ArrowRight size={14} /></Button>}
            />
          ) : (
            <AgentActivityFeed items={activityItems} max={8} />
          )}
        </GlassCard>

        <GlassCard style={{ padding: '1.35rem' }}>
          <SectionHeader eyebrow="Alpha" icon={<Sparkles size={18} color="var(--accent-purple)" />} title="Top opportunities" />
          {opportunities.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={24} />}
              title="Scanning markets"
              description="Run analysis or shadow tracking to populate discoveries."
              action={<Button onClick={() => onNavigate('dashboard')}>Start <ArrowRight size={14} /></Button>}
            />
          ) : (
            <div className="mission-opps">
              {opportunities.map((o) => (
                <div key={o.id} className="insight-row insight-row--compact">
                  <span className="live-dot" style={{ background: o.accent, boxShadow: `0 0 8px ${o.accent}` }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>{o.label}</p>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{o.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {riskAlerts.length > 0 && (
        <GlassCard className="mission-risk">
          <SectionHeader eyebrow="Risk radar" icon={<AlertTriangle size={18} color="var(--accent-amber)" />} title="Active alerts" />
          {riskAlerts.map((a) => (
            <div key={a.id} className="alert-banner" data-level={a.level}>
              <AlertTriangle size={16} /><span>{a.msg}</span>
            </div>
          ))}
        </GlassCard>
      )}

      <GlassCard style={{ padding: '1.35rem' }}>
        <SectionHeader eyebrow="Navigate" icon={<Zap size={18} color="var(--accent-blue)" />} title="Workspace modules" />
        <div className="quick-actions-grid">
          <QuickAction icon={<BarChart2 size={18} />} label="Markets" desc="Stock & index intel" onClick={() => onNavigate('dashboard')} />
          <QuickAction icon={<Briefcase size={18} />} label="Portfolio" desc="Build & optimize" onClick={() => onNavigate('portfolio')} />
          <QuickAction icon={<Eye size={18} />} label="Shadow" desc="Smart money" onClick={() => onNavigate('shadow')} />
          <QuickAction icon={<Calendar size={18} />} label="Calendar" desc="Seasonality" onClick={() => onNavigate('calendar')} />
        </div>
      </GlassCard>
    </PageShell>
  );
}
