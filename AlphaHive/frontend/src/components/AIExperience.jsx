import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, MessageSquare, BarChart3, Shield, Search,
  PieChart, Eye, LineChart, FileText, Sparkles, ArrowRight,
} from 'lucide-react';

export const AGENTS = [
  { id: 'technical', name: 'Technical', icon: BarChart3, color: '#8b5cf6', angle: 0 },
  { id: 'sentiment', name: 'Sentiment', icon: MessageSquare, color: '#38bdf8', angle: 36 },
  { id: 'fundamental', name: 'Fundamental', icon: TrendingUp, color: '#4f8bff', angle: 72 },
  { id: 'dividend', name: 'Dividend', icon: PieChart, color: '#10b981', angle: 108 },
  { id: 'forensic', name: 'Forensic', icon: Search, color: '#f59e0b', angle: 144 },
  { id: 'sector', name: 'Sector', icon: Sparkles, color: '#a78bfa', angle: 180 },
  { id: 'portfolio', name: 'Portfolio', icon: Shield, color: '#6366f1', angle: 216 },
  { id: 'shadow', name: 'Smart Money', icon: Eye, color: '#f43f5e', angle: 252 },
  { id: 'forecast', name: 'Forecast', icon: LineChart, color: '#34d399', angle: 288 },
  { id: 'reporting', name: 'Reporting', icon: FileText, color: '#fb7185', angle: 324 },
];

export function AgentSwarm({ size = 280, activeAgents = AGENTS, pulse = true }) {
  const radius = size * 0.34;
  const center = size / 2;
  const hubSize = Math.round(size * 0.2);
  const nodeSize = Math.round(size * 0.128);
  const iconSize = Math.max(14, Math.round(size * 0.057));
  const hubIcon = Math.max(22, Math.round(size * 0.093));
  const nodeOffset = nodeSize / 2;
  const hubOffset = hubSize / 2;

  return (
    <div
      className="agent-swarm"
      style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}
      aria-hidden
    >
      <motion.div
        className="agent-swarm__ring"
        animate={{ rotate: pulse ? 360 : 0 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: size * 0.08, borderRadius: '50%',
          border: '1px dashed rgba(99,102,241,0.28)',
        }}
      />
      <motion.div
        animate={{ scale: pulse ? [1, 1.06, 1] : 1, opacity: pulse ? [0.5, 0.85, 0.5] : 0.6 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: size * 0.22, borderRadius: '50%',
          background: 'var(--grad-primary-soft)', filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute', left: center - hubOffset, top: center - hubOffset,
          width: hubSize, height: hubSize, borderRadius: '50%',
          background: 'var(--grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(79,139,255,0.45)',
          zIndex: 2,
        }}
      >
        <Brain size={hubIcon} color="#fff" strokeWidth={2.2} />
      </div>
      {activeAgents.map((agent, i) => {
        const rad = (agent.angle * Math.PI) / 180;
        const x = center + Math.cos(rad) * radius - nodeOffset;
        const y = center + Math.sin(rad) * radius - nodeOffset;
        const Icon = agent.icon;
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.04 * i, type: 'spring', stiffness: 260, damping: 18 }}
            style={{
              position: 'absolute', left: x, top: y, width: nodeSize, height: nodeSize,
              borderRadius: Math.round(nodeSize * 0.33), display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${agent.color}22`, border: `1px solid ${agent.color}55`,
              color: agent.color, zIndex: 1,
            }}
            title={agent.name}
          >
            <Icon size={iconSize} />
            {pulse && (
              <span
                style={{
                  position: 'absolute', inset: -2, borderRadius: Math.round(nodeSize * 0.39),
                  border: `1px solid ${agent.color}44`,
                  animation: `livePulse ${1.6 + i * 0.15}s ease-out infinite`,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export function AgentActivityFeed({ items, max = 6 }) {
  const feed = useMemo(() => (items?.length ? items.slice(0, max) : []), [items, max]);
  if (!feed.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {feed.map((entry, i) => (
        <div key={entry.id || i} className="insight-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {entry.message}
            </p>
            {entry.time && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 2 }}>{entry.time}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroBanner({
  eyebrow, title, subtitle, actions, visual, stats,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="hero-banner glow-ring"
    >
      <div className="hero-banner__mesh" aria-hidden />
      <div className="hero-banner__content">
        <div className="hero-banner__copy">
          {eyebrow && <p className="hero-banner__eyebrow">{eyebrow}</p>}
          <h1 className="hero-banner__title">{title}</h1>
          {subtitle && <p className="hero-banner__subtitle">{subtitle}</p>}
          {actions && <div className="hero-banner__actions">{actions}</div>}
          {stats && (
            <div className="hero-banner__stats">
              {stats.map(({ label, value, accent }) => (
                <div key={label} className="hero-banner__stat">
                  <span className="hero-banner__stat-label">{label}</span>
                  <span className="hero-banner__stat-value tabular" style={{ color: accent || 'var(--text-primary)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {visual && <div className="hero-banner__visual">{visual}</div>}
      </div>
    </motion.div>
  );
}

export function InsightCard({
  icon, title, value, delta, accent = 'var(--accent-blue)', hint, onClick, children,
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`insight-card${onClick ? ' insight-card--clickable' : ''}`}
    >
      <div className="insight-card__head">
        <span className="insight-card__label">{title}</span>
        {icon && (
          <span className="insight-card__icon" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}33` }}>
            {icon}
          </span>
        )}
      </div>
      {value !== undefined && (
        <p className="insight-card__value tabular" style={{ color: accent }}>{value}</p>
      )}
      {(delta !== undefined || hint) && (
        <div className="insight-card__meta">
          {delta !== undefined && delta !== null && (
            <span style={{ color: delta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700, fontSize: '0.74rem' }}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="insight-card__hint">{hint}</span>}
        </div>
      )}
      {children}
    </Wrapper>
  );
}

export function QuickAction({ icon, label, desc, onClick, accent = 'var(--accent-blue)' }) {
  return (
    <button type="button" onClick={onClick} className="quick-action pressable">
      <span className="quick-action__icon" style={{ color: accent, background: `${accent}14`, borderColor: `${accent}30` }}>
        {icon}
      </span>
      <span className="quick-action__copy">
        <span className="quick-action__label">{label}</span>
        {desc && <span className="quick-action__desc">{desc}</span>}
      </span>
      <ArrowRight size={16} className="quick-action__arrow" />
    </button>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented-control" role="tablist">
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`segmented-control__item${active ? ' segmented-control__item--active' : ''}`}
          >
            {Icon && <Icon size={15} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function TerminalPanel({ lines, title = 'Intelligence Terminal', glow = false }) {
  const text = Array.isArray(lines) ? lines.join('\n') : lines;
  return (
    <div className={`terminal-panel${glow ? ' terminal-panel--glow' : ''}`}>
      <div className="terminal-panel__header">
        <span className="terminal-panel__dots">
          <span /><span /><span />
        </span>
        <span className="terminal-panel__title">{title}</span>
      </div>
      <pre className="terminal-panel__body font-mono">{text}</pre>
    </div>
  );
}

export function ConfidenceMeter({ value, label = 'Confidence' }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color = pct >= 70 ? 'var(--accent-emerald)' : pct >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div className="confidence-meter">
      <div className="confidence-meter__head">
        <span>{label}</span>
        <span className="tabular" style={{ color, fontWeight: 800 }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="confidence-meter__track">
        <motion.div
          className="confidence-meter__fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

export function PageShell({ children, className = '' }) {
  return (
    <motion.div
      className={`ah-page-shell${className ? ` ${className}` : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
