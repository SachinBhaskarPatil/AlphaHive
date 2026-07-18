import { useCallback, useEffect, useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { GlassCard, SectionHeader, Badge, LoadingBlock, StatCard } from '../components/Shared';
import { AgentSwarm, PageShell } from '../components/AIExperience';
import { brainApi } from '../api';

const OUTCOME_COLOR = (outcome) => {
  const o = String(outcome || '').toLowerCase();
  if (o.includes('success')) return '#10b981';
  if (o.includes('fail')) return '#f43f5e';
  if (o.includes('neutral')) return '#94a3b8';
  return '#fbbf24';
};

export default function BrainTab({ handle }) {
  const [agents, setAgents] = useState([]);
  const [counts, setCounts] = useState({});
  const [memories, setMemories] = useState([]);
  const [memStats, setMemStats] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, memoryRes, autonomyRes] = await Promise.all([
        brainApi.agents(),
        brainApi.memory(handle),
        brainApi.autonomy(),
      ]);
      setAgents(agentsRes.data.agents || []);
      setCounts(agentsRes.data.counts || {});
      setMemories(memoryRes.data.memories || []);
      setMemStats(memoryRes.data.stats || {});
      setEvents(autonomyRes.data.events || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load agent brain data.');
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <SectionHeader
          eyebrow="Agentic core"
          icon={<Brain size={20} color="var(--accent-purple)" />}
          title="Agent Brain"
          sub="Roster, memory ledger, and autonomy stream — the hive's collective consciousness."
        />
        <button type="button" onClick={load} disabled={loading} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: 'none', background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', cursor: loading ? 'wait' : 'pointer',
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
        <GlassCard><LoadingBlock label="Loading agent brain…" /></GlassCard>
      ) : (
        <>
          <GlassCard className="glow-ring" style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem', justifyContent: 'center' }}>
            <AgentSwarm size={220} pulse />
            <div style={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent-purple)', marginBottom: 8 }}>
                SWARM STATUS
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
                {agents.length} agents coordinating in parallel
              </p>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
                Each node specializes in a domain — technical, sentiment, forensic, sector — then synthesizes into unified intelligence.
              </p>
            </div>
          </GlassCard>

          <div className="dashboard-grid dashboard-grid--metrics" style={{ marginBottom: '1.5rem' }}>
            {Object.entries(counts).map(([k, v]) => (
              <StatCard key={k} label={k.replace(/_/g, ' ')} value={v} accent="var(--accent-violet)" />
            ))}
          </div>

          <div className="mr-grid-auto" style={{ marginBottom: '1.5rem' }}>
            <GlassCard>
              <h3 style={{ marginBottom: '1rem' }}>Agent Roster</h3>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {agents.length === 0 ? <p style={{ color: '#64748b' }}>No agents for this filter.</p> : agents.map((a) => (
                  <div key={a.id} style={{ padding: '10px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{a.emoji} {a.role}</strong>
                      <Badge text={a.platform} color="#8b5cf6" />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>{a.goal}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 style={{ marginBottom: '0.6rem' }}>Active Memory</h3>
              {memStats.win_rate_pct != null ? (
                <p style={{ marginBottom: '0.4rem', color: '#10b981', fontWeight: 700 }}>
                  Win rate: {memStats.win_rate_pct}% ({memStats.wins}/{memStats.directional} directional)
                </p>
              ) : memStats.validated != null && (
                <p style={{ marginBottom: '0.4rem', color: '#94a3b8' }}>No directional calls validated yet.</p>
              )}
              {memStats.total != null && (
                <p style={{ marginBottom: '1rem', fontSize: '0.72rem', color: '#64748b' }}>
                  {memStats.validated} validated
                  {memStats.neutral ? ` · ${memStats.neutral} neutral` : ''}
                  {memStats.pending ? ` · ${memStats.pending} pending` : ''}
                  {memStats.source ? ` · source: ${memStats.source}` : ''}
                </p>
              )}
              <div style={{ maxHeight: 360, overflowY: 'auto', fontSize: '0.8rem' }}>
                {memories.length === 0 ? <p style={{ color: '#64748b' }}>No memories yet.</p> : memories.slice(0, 20).map((m, i) => (
                  <div key={`${m.ticker}-${m.date}-${i}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{m.ticker}</strong>
                      <span style={{ color: '#94a3b8' }}> — {m.signal}</span>
                      {m.date && <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>{m.date}{m.confidence ? ` · ${m.confidence}` : ''}</span>}
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                      borderRadius: 999, color: OUTCOME_COLOR(m.outcome),
                      background: `${OUTCOME_COLOR(m.outcome)}1f`,
                    }}>
                      {m.outcome || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <h3 style={{ marginBottom: '1rem' }}>Autonomy Activity Stream</h3>
            <div style={{ maxHeight: 280, overflowY: 'auto', fontSize: '0.82rem' }}>
              {events.length === 0 ? <p style={{ color: '#64748b' }}>No autonomy events.</p> : events.slice().reverse().slice(0, 30).map((e, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#64748b' }}>{e.timestamp?.split('T')[0]}</span>
                  <strong style={{ marginLeft: 8, color: '#22d3ee' }}>{e.role}</strong>
                  <Badge text={e.type} />
                  <p style={{ color: '#94a3b8', marginTop: 4 }}>{e.details}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </PageShell>
  );
}
