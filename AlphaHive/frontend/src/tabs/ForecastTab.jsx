import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, History, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { GlassCard, SectionHeader, Badge, LoadingBlock } from '../components/Shared';
import { PageShell } from '../components/AIExperience';
import { useCommandModal } from '../context/CommandModalContext';
import { forecastApi, portfolioApi } from '../api';

const thBase = { padding: '0 12px 12px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' };
const tdBase = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const numCell = {
  ...tdBase,
  textAlign: 'right',
  fontFamily: 'JetBrains Mono, monospace',
  fontVariantNumeric: 'tabular-nums',
  color: '#94a3b8',
};

function tickerKey(raw) {
  return String(raw || '').trim().toUpperCase();
}

function formatForecastDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).split('T')[0];
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ForecastTab({ handle, onNavigate }) {
  const { showAlert } = useCommandModal();
  const [forecasts, setForecasts] = useState([]);
  const [untracked, setUntracked] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await forecastApi.list(handle, true);
      const rows = (data.forecasts || []).sort(
        (a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0),
      );
      setForecasts(rows);
      const tracked = new Set(rows.map((f) => tickerKey(f.ticker)));
      const pf = await portfolioApi.list(handle);
      const names = pf.data.portfolios || [];
      const holdingsResponses = await Promise.all(
        names.map((name) => portfolioApi.get(handle, name).catch(() => ({ data: { holdings: [] } }))),
      );
      const allTickers = new Set();
      holdingsResponses.forEach(({ data: p }) => {
        (p.holdings || []).forEach((h) => allTickers.add(h.Symbol));
      });
      setUntracked([...allTickers].filter((t) => !tracked.has(tickerKey(t))).sort());
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load forecasts.');
      setForecasts([]);
      setUntracked([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [handle]);

  const toggle = (ts) => setSelected((s) => (s.includes(ts) ? s.filter((x) => x !== ts) : [...s, ts]));

  const toggleAll = () => {
    if (selected.length === forecasts.length) setSelected([]);
    else setSelected(forecasts.map((f) => f.timestamp));
  };

  const remove = async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await forecastApi.remove(handle, selected);
      setSelected([]);
      await load();
    } catch (e) {
      showAlert(e.response?.data?.error || 'Delete failed.', { variant: 'error', title: 'Forecast' });
    } finally {
      setBusy(false);
    }
  };

  const track = async (ticker) => {
    if (busy) return;
    setBusy(true);
    try {
      await forecastApi.generate({ user_handle: handle, ticker, current_price: 0, target_price: 0 });
      await load();
    } catch (e) {
      showAlert(e.response?.data?.error || 'Could not track ticker.', { variant: 'error', title: 'Forecast' });
    } finally {
      setBusy(false);
    }
  };

  const livePerf = forecasts.filter((f) => f.change_pct != null);
  const avgPerf = livePerf.length
    ? livePerf.reduce((a, f) => a + f.change_pct, 0) / livePerf.length
    : 0;

  return (
    <PageShell>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader icon={<Target size={24} color="var(--accent-cyan)" />} title="Forecast Tracker" sub="Live performance vs saved entry prices" />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <GlassCard style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '0.7rem' }}>AVG PERFORMANCE</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: avgPerf >= 0 ? '#10b981' : '#f43f5e' }}>{avgPerf >= 0 ? '+' : ''}{avgPerf.toFixed(2)}%</p>
        </GlassCard>
        <GlassCard style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '0.7rem' }}>ACTIVE FORECASTS</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{forecasts.length}</p>
        </GlassCard>
      </div>

      {error && (
        <GlassCard style={{ marginBottom: '1rem', border: '1px solid rgba(244,63,94,0.3)' }}>
          <p style={{ color: '#f43f5e', marginBottom: 8 }}>{error}</p>
          <button type="button" onClick={load} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
            Retry
          </button>
        </GlassCard>
      )}

      {untracked.length > 0 && (
        <GlassCard style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.8rem', color: '#94a3b8' }}>Untracked portfolio holdings ({untracked.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {untracked.map((t) => (
              <button key={t} type="button" onClick={() => track(t)} disabled={busy} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.3)', background: 'transparent', color: '#22d3ee', cursor: 'pointer' }}>
                + {t}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? <LoadingBlock label="Loading forecasts…" /> : forecasts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <History size={36} style={{ margin: '0 auto 12px' }} />
            <p style={{ marginBottom: '1rem' }}>No forecasts yet.</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Save a 2026 forecast from Market Analysis Hub after analyzing a stock.</p>
            {onNavigate && (
              <button type="button" onClick={() => onNavigate('dashboard')} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'rgba(6,182,212,0.15)', color: '#22d3ee', fontWeight: 700,
              }}
              >
                Go to Market Analysis Hub →
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                {selected.length > 0 ? `${selected.length} selected` : `${forecasts.length} tracked`}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={load} disabled={loading || busy} style={{
                  padding: '8px 12px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 700,
                }}>
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={!selected.length || busy}
                  title={selected.length ? 'Delete selected forecasts' : 'Select rows to delete'}
                style={{
                  display: 'flex', gap: 6, alignItems: 'center', padding: '8px 16px',
                  borderRadius: 10, border: '1px solid rgba(244,63,94,0.25)',
                  background: 'rgba(244,63,94,0.12)', color: '#f43f5e', fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: selected.length && !busy ? 'pointer' : 'not-allowed',
                  opacity: selected.length && !busy ? 1 : 0.45,
                  transition: 'opacity 0.15s ease',
                }}
              >
                <Trash2 size={14} /> Delete{selected.length ? ` (${selected.length})` : ''}
                </button>
              </div>
            </div>
            <div className="mr-table-scroll">
              <table style={{ width: '100%', minWidth: 720, fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    <th style={{ ...thBase, width: 34 }}>
                      <input
                        type="checkbox"
                        checked={forecasts.length > 0 && selected.length === forecasts.length}
                        onChange={toggleAll}
                        style={{ accentColor: '#06b6d4', cursor: 'pointer' }}
                        aria-label="Select all forecasts"
                      />
                    </th>
                    <th style={{ ...thBase, textAlign: 'left' }}>Date</th>
                    <th style={{ ...thBase, textAlign: 'left' }}>Ticker</th>
                    <th style={{ ...thBase, textAlign: 'right' }}>Entry</th>
                    <th style={{ ...thBase, textAlign: 'right' }}>Live</th>
                    <th style={{ ...thBase, textAlign: 'right' }}>Change</th>
                    <th style={{ ...thBase, textAlign: 'right' }}>Target</th>
                    <th style={{ ...thBase, textAlign: 'left', paddingLeft: 18 }}>Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => {
                    const chg = f.change_pct;
                    const up = chg != null && chg >= 0;
                    const isSel = selected.includes(f.timestamp);
                    const upside = f.target_price != null && f.current_price_live
                      ? (f.target_price - f.current_price_live) / f.current_price_live * 100
                      : null;
                    return (
                      <tr
                        key={`${f.ticker}-${f.timestamp}`}
                        onClick={() => toggle(f.timestamp)}
                        style={{
                          cursor: 'pointer',
                          background: isSel ? 'rgba(6,182,212,0.07)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={tdBase}>
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggle(f.timestamp)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ accentColor: '#06b6d4', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ ...tdBase, color: '#64748b', whiteSpace: 'nowrap' }}>{formatForecastDate(f.timestamp)}</td>
                        <td style={{ ...tdBase, fontWeight: 800, color: '#22d3ee' }}>{f.ticker}</td>
                        <td style={numCell}>{f.current_price != null ? `₹${f.current_price.toFixed(2)}` : '—'}</td>
                        <td style={{ ...numCell, color: '#e2e8f0', fontWeight: 700 }}>{f.current_price_live != null ? `₹${f.current_price_live.toFixed(2)}` : '—'}</td>
                        <td style={{ ...tdBase, textAlign: 'right' }}>
                          {chg == null ? (
                            <span style={{ color: '#475569' }}>—</span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                              fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums',
                              color: up ? '#10b981' : '#f43f5e',
                              background: up ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                            }}>
                              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {up ? '+' : ''}{chg.toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td style={numCell}>
                          {f.target_price != null ? `₹${f.target_price.toFixed(2)}` : '—'}
                          {upside != null && (
                            <span style={{ display: 'block', fontSize: '0.62rem', color: upside >= 0 ? '#10b981' : '#f43f5e', opacity: 0.75 }}>
                              {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% upside
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdBase, paddingLeft: 18 }}>
                          <Badge text={f.strategy} color={/sd/i.test(f.strategy || '') ? '#a855f7' : '#22d3ee'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GlassCard>
    </motion.div>
    </PageShell>
  );
}
