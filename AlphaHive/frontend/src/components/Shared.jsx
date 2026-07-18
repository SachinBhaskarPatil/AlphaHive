import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { PageHeader, EmptyWorkspace, Surface, Badge as UiBadge } from './ui/primitives';

export function SectionHeader({ icon, title, sub, actions, eyebrow }) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      icon={icon}
      title={title}
      subtitle={sub}
      actions={actions}
    />
  );
}

export function GlassCard({ children, style = {}, interactive = false, className = '', ...rest }) {
  return (
    <Surface
      interactive={interactive}
      className={`${className}`}
      style={style}
      padding={false}
      {...rest}
    >
      <div style={{ padding: 'var(--glass-pad, 1.5rem)' }}>{children}</div>
    </Surface>
  );
}

export function Badge({ text, color = '#4f8bff', children, tone }) {
  if (text !== undefined) {
    return (
      <span style={{
        display: 'inline-block', fontSize: '0.6rem', padding: '2px 8px',
        background: `${color}1f`, color, borderRadius: '999px', fontWeight: 700,
        letterSpacing: '0.02em', border: `1px solid ${color}33`, whiteSpace: 'nowrap',
      }}>{text}</span>
    );
  }
  return <UiBadge tone={tone || 'blue'}>{children}</UiBadge>;
}

export const SidebarItem = ({ icon, label, active, onClick, collapsed = false }) => (
  <button
    id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    title={collapsed ? label : undefined}
    className={`ah-rail-item${active ? ' ah-rail-item--active' : ''}`}
    style={collapsed ? { justifyContent: 'center' } : undefined}
  >
    <span className="ah-rail-item__indicator" aria-hidden />
    <span className="ah-rail-item__icon">{icon}</span>
    {!collapsed && <span className="ah-rail-item__label">{label}</span>}
  </button>
);

export const Spinner = ({ size = 20, color = 'var(--accent-blue)' }) => (
  <span
    className="mr-spinner"
    role="status"
    aria-label="Loading"
    style={{ width: size, height: size, borderTopColor: color }}
  />
);

export const HiveLoader = ({ size = 42 }) => (
  <span className="hive-loader" role="status" aria-label="AI swarm working" style={{ width: size, height: size }}>
    {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
  </span>
);

export const ThinkingDots = () => (
  <span className="thinking-dots" aria-hidden>
    <span /><span /><span />
  </span>
);

export const LoadingBlock = ({ label = 'Loading…', size = 22 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600,
    padding: '0.5rem 0',
  }}>
    <HiveLoader size={Math.max(size, 28)} />
    <span>{label}</span>
  </div>
);

export const AILoader = ({ title = 'Agents at work', message = 'Coordinating the swarm…', progress }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
    padding: '2.5rem 1.5rem', textAlign: 'center',
  }}>
    <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'var(--grad-primary-soft)', filter: 'blur(6px)',
        animation: 'glowBreathe 2.4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 6, borderRadius: '50%',
        border: '1.5px dashed rgba(99,102,241,0.4)', animation: 'orbit 8s linear infinite',
      }} />
      <HiveLoader size={40} />
    </div>
    <div>
      <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>{title}</p>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', maxWidth: '36ch', margin: '0 auto' }} className="stream-caret">
        {message}
      </p>
    </div>
    {progress === undefined ? (
      <div className="ai-progress" style={{ width: 220 }} />
    ) : (
      <div className="ai-progress" style={{ width: 220 }}>
        <span style={{
          position: 'absolute', inset: 0, width: `${Math.min(100, Math.max(0, progress))}%`,
          borderRadius: 'inherit', background: 'var(--grad-primary)',
        }} />
      </div>
    )}
  </div>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <EmptyWorkspace icon={icon} title={title} description={description} action={action} />
);

export const StatCard = ({ icon, label, value, delta, accent = 'var(--accent-blue)', hint }) => (
  <div className="insight-card insight-card--clickable" style={{ cursor: 'default' }}>
    <div className="insight-card__head">
      <span className="insight-card__label">{label}</span>
      {icon && (
        <span className="insight-card__icon" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}33` }}>
          {icon}
        </span>
      )}
    </div>
    <p className="insight-card__value tabular">{value}</p>
    <div className="insight-card__meta">
      {delta !== undefined && delta !== null && (
        <span style={{ color: delta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700, fontSize: '0.74rem' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}%
        </span>
      )}
      {hint && <span className="insight-card__hint">{hint}</span>}
    </div>
  </div>
);

export const HeatCell = ({ val }) => {
  if (val === null || val === undefined) {
    return <td style={{ padding: '6px', fontSize: '0.7rem', color: '#334155', textAlign: 'center' }}>–</td>;
  }
  const abs = Math.min(Math.abs(val), 12);
  const intensity = abs / 12;
  const bg = val >= 0
    ? `rgba(16,185,129,${0.1 + intensity * 0.7})`
    : `rgba(244,63,94,${0.1 + intensity * 0.7})`;
  return (
    <td style={{
      padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700,
      textAlign: 'center', borderRadius: '6px', background: bg,
      color: val >= 0 ? '#34d399' : '#fb7185', minWidth: '52px',
    }}>
      {val > 0 ? '+' : ''}{val.toFixed(1)}%
    </td>
  );
};

export const inputStyle = {
  width: '100%', background: 'rgba(0,0,0,0.28)', border: '1px solid var(--border-glass)',
  padding: '1rem 1rem 1rem 3rem', borderRadius: 'var(--radius-lg)', color: 'white',
  fontSize: '0.95rem', fontFamily: "'JetBrains Mono', monospace", outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

export const btnPrimary = {
  height: '52px', padding: '0 2rem', background: 'var(--grad-primary)',
  border: 'none', borderRadius: 'var(--radius-lg)', color: 'white', fontWeight: 800, cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
  boxShadow: '0 10px 28px -10px rgba(99,102,241,0.6)',
};

export function UserAvatar({
  src, name = '', size = 36, className = '', iconSize, as: Tag = 'span', ...rest
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;
  const resolvedIcon = iconSize || Math.max(14, Math.round(size * 0.44));

  return (
    <Tag
      className={`ah-user-avatar${showPhoto ? ' ah-user-avatar--photo' : ''} ${className}`.trim()}
      style={{ '--avatar-size': `${size}px` }}
      {...rest}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={name ? `${name}'s profile` : 'Profile photo'}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <User size={resolvedIcon} aria-hidden />
      )}
    </Tag>
  );
}
