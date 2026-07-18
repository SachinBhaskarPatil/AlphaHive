import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassCard, SectionHeader, Badge, LoadingBlock, StatCard } from '../components/Shared';
import { PageShell } from '../components/AIExperience';
import { healthApi } from '../api';

const fmtTs = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 19);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const clip = (text, max = 220) => {
  if (!text) return '';
  const s = String(text);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

export default function HealthTab() {
  const [overview, setOverview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, err, eng] = await Promise.all([
        healthApi.overview(),
        healthApi.errors(),
        healthApi.engagement(),
      ]);
      setOverview(ov.data);
      setErrors(err.data.errors || []);
      setEngagement(eng.data.events || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load system health.');
      setOverview(null);
      setErrors([]);
      setEngagement([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <SectionHeader
          eyebrow="Platform ops"
          icon={<Activity size={20} color="var(--accent-rose)" />}
          title="System Health"
          sub="Workflows, engagement, and error monitoring for your intelligence stack."
        />
        <button type="button" onClick={load} disabled={loading} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: 'none', background: 'rgba(244,63,94,0.14)', color: '#fca5a5', cursor: loading ? 'wait' : 'pointer',
          fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <GlassCard style={{ marginBottom: '1rem', border: '1px solid rgba(244,63,94,0.3)' }}>
          <p style={{ color: '#f43f5e', marginBottom: 8 }}>{error}</p>
          <button type="button" onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} /> Retry
          </button>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard><LoadingBlock label="Loading system health…" /></GlassCard>
      ) : overview && (
        <div className="dashboard-grid dashboard-grid--metrics" style={{ marginBottom: '1.5rem' }}>
          <StatCard
            label="Success rate"
            value={`${overview.success_rate_pct}%`}
            accent={overview.success_rate_pct >= 80 ? 'var(--accent-emerald)' : overview.success_rate_pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}
          />
          <StatCard label="Workflows" value={overview.workflow_sessions} accent="var(--accent-blue)" />
          <StatCard label="Engagement OK" value={overview.engagement_success} accent="var(--accent-cyan)" />
          <StatCard label="Errors" value={overview.error_count} accent="var(--accent-red)" />
        </div>
      )}

      {!loading && (
        <div className="mr-grid-auto">
          <GlassCard>
            <h3 style={{ marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={18} color="#f43f5e" /> Recent Errors
            </h3>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {errors.length === 0 ? <p style={{ color: '#64748b' }}>No errors logged.</p> : errors.map((e, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{fmtTs(e.timestamp || e.ts)}</span>
                    {e.type && <Badge text={e.type} color="#f43f5e" />}
                    {e.context?.location && (
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 6 }}>
                        {e.context.location}
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#f43f5e', marginTop: 6, lineHeight: 1.45, wordBreak: 'break-word' }}>
                    {clip(e.message || e.error || JSON.stringify(e))}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <h3 style={{ marginBottom: '1rem' }}>Engagement History</h3>
            <div style={{ maxHeight: 320, overflowY: 'auto', fontSize: '0.8rem' }}>
              {engagement.length === 0 ? (
                <p style={{ color: '#64748b' }}>No engagement events yet.</p>
              ) : engagement.slice().sort((a, b) => (b.ts || b.timestamp || '').localeCompare(a.ts || a.timestamp || '')).slice(0, 20).map((e, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#22d3ee' }}>{e.event || e.type}</strong>
                    {e.status === 'failed' && <Badge text="Failed" color="#f43f5e" />}
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{fmtTs(e.ts || e.timestamp)}</span>
                  </div>
                  {(e.desc || e.description) && (
                    <p style={{ color: '#94a3b8', marginTop: 4, fontSize: '0.75rem' }}>{e.desc || e.description}</p>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </PageShell>
  );
}
