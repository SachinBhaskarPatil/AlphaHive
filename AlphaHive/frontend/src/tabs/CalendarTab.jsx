import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, CheckCircle, ArrowDownCircle, ArrowUpCircle, Sparkles } from 'lucide-react';
import { GlassCard, SectionHeader, LoadingBlock } from '../components/Shared';
import { PageShell } from '../components/AIExperience';
import { calendarApi, marketApi } from '../api';

const OVERVIEW_YEAR = new Date().getFullYear();

const selectStyle = {
  padding: '9px 12px', borderRadius: 10, background: '#0f172a', color: 'white',
  border: '1px solid #334155', fontSize: '0.82rem', outline: 'none', cursor: 'pointer',
};
const thStyle = {
  padding: '10px 12px', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)',
};
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const statCard = {
  display: 'flex', flexDirection: 'column', gap: 6, padding: '0.8rem 1rem',
  borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
};
const statLabel = { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' };
const statValue = { fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0' };

export default function CalendarTab() {
  const [windows, setWindows] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [mode, setMode] = useState('Subha Muhurta');
  const [robust, setRobust] = useState(false);
  const [tickerCal, setTickerCal] = useState([]);
  const [analyzedMode, setAnalyzedMode] = useState('Subha Muhurta');
  const [analyzedTicker, setAnalyzedTicker] = useState('');
  const [category, setCategory] = useState('Nifty 50');
  const [tickers, setTickers] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [tickerLoading, setTickerLoading] = useState(false);
  const [tickerError, setTickerError] = useState('');

  useEffect(() => {
    setOverviewLoading(true);
    setOverviewError('');
    calendarApi.overview(OVERVIEW_YEAR)
      .then((r) => {
        setWindows(r.data.windows || []);
        setPatterns(r.data.patterns || []);
      })
      .catch((e) => {
        setOverviewError(e.response?.data?.error || 'Could not load calendar overview.');
        setWindows([]);
        setPatterns([]);
      })
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    marketApi.tickers(category)
      .then((r) => {
        const list = r.data.tickers || [];
        setTickers(list);
        setTicker((cur) => (list.length && !list.some((t) => t.ticker === cur) ? list[0].ticker : cur));
      })
      .catch(() => setTickers([]));
  }, [category]);

  const stats = useMemo(() => {
    const gains = tickerCal.map((r) => r.avg_gain_pct).filter((g) => g != null);
    if (!gains.length) return null;
    const maxAbs = Math.max(...gains.map((g) => Math.abs(g)), 0.0001);
    let best = tickerCal[0];
    let worst = tickerCal[0];
    tickerCal.forEach((r) => {
      if (r.avg_gain_pct == null) return;
      if (best.avg_gain_pct == null || r.avg_gain_pct > best.avg_gain_pct) best = r;
      if (worst.avg_gain_pct == null || r.avg_gain_pct < worst.avg_gain_pct) worst = r;
    });
    const avg = gains.reduce((a, g) => a + g, 0) / gains.length;
    const positive = gains.filter((g) => g >= 0).length;
    return { maxAbs, best, worst, avg, positive, total: gains.length };
  }, [tickerCal]);

  const loadTicker = async () => {
    setTickerLoading(true);
    setTickerError('');
    setTickerCal([]);
    try {
      const { data } = await calendarApi.ticker(ticker, mode, robust);
      setTickerCal(data.calendar || []);
      setAnalyzedMode(mode);
      setAnalyzedTicker(data.ticker || ticker);
      if (!data.calendar?.length) setTickerError('No calendar rows returned for this ticker.');
    } catch (e) {
      setTickerError(e.response?.data?.error || 'Ticker calendar analysis failed.');
    } finally {
      setTickerLoading(false);
    }
  };

  return (
    <PageShell>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader icon={<Calendar size={24} color="#fbbf24" />} title="Trading Calendar" sub="Muhurtham windows + per-ticker seasonality" />

      {overviewError && (
        <GlassCard style={{ marginBottom: '1rem', border: '1px solid rgba(244,63,94,0.3)' }}>
          <p style={{ color: '#f43f5e' }}>{overviewError}</p>
        </GlassCard>
      )}

      <div className="mr-grid-auto" style={{ marginBottom: '1.5rem' }}>
        <GlassCard>
          <h3 style={{ color: '#fbbf24', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle size={18} /> Auspicious Windows ({OVERVIEW_YEAR})
          </h3>
          {overviewLoading ? <LoadingBlock label="Loading windows…" color="#fbbf24" /> : windows.length === 0 ? (
            <p style={{ color: '#64748b' }}>No windows listed.</p>
          ) : windows.map((w, i) => (
            <div key={i} style={{ padding: '0.9rem', marginBottom: 8, background: 'rgba(251,191,36,0.05)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#fbbf24' }}>{w.name}</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{w.date}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>{w.note}</p>
            </div>
          ))}
        </GlassCard>
        <GlassCard>
          <h3 style={{ color: '#06b6d4', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <TrendingUp size={18} /> Seasonal Patterns
          </h3>
          {overviewLoading ? <LoadingBlock label="Loading patterns…" /> : patterns.length === 0 ? (
            <p style={{ color: '#64748b' }}>No seasonal patterns.</p>
          ) : patterns.map((p, i) => (
            <div key={i} style={{ padding: '0.9rem', marginBottom: 8, background: 'rgba(6,182,212,0.05)', borderRadius: 12 }}>
              <strong style={{ color: '#06b6d4' }}>{p.season}</strong>
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#64748b' }}>{p.months}</span>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>{p.note}</p>
            </div>
          ))}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 style={{ marginBottom: '0.4rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Calendar size={18} color="#fbbf24" /> Per-Ticker Calendar
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
          Best historical buy/sell days within each month (averaged across all available years).
          {' '}Avg Gain is the intra-month move from the buy day to the sell day.
        </p>
        <div className="mr-toolbar calendar-controls" style={{ marginBottom: '1rem' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field ah-input">
            {['Nifty 50', 'Nifty Next 50', 'Midcap', 'All'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="field ah-input">
            {tickers.map((t) => <option key={t.ticker} value={t.ticker}>{t.name}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="field ah-input">
            <option>Strategic</option>
            <option>Subha Muhurta</option>
          </select>
          <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', minHeight: 44 }}>
            <input type="checkbox" checked={robust} onChange={(e) => setRobust(e.target.checked)} style={{ accentColor: '#fbbf24', cursor: 'pointer' }} /> Robust
          </label>
          <button type="button" onClick={loadTicker} disabled={tickerLoading} className="btn-primary" style={{ minHeight: 48, opacity: tickerLoading ? 0.7 : 1 }}>
            {tickerLoading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {tickerError && <p style={{ color: '#f43f5e', marginBottom: '1rem' }}>{tickerError}</p>}
        {tickerCal.length > 0 && (
          <>
            {analyzedTicker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>{analyzedTicker}</span>
                <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', fontWeight: 700 }}>{analyzedMode}</span>
                {robust && <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(168,85,247,0.14)', color: '#c084fc', fontWeight: 700 }}>Robust</span>}
              </div>
            )}

            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1.1rem' }}>
                <div style={statCard}>
                  <span style={statLabel}><Sparkles size={12} /> Best Month</span>
                  <span style={{ ...statValue, color: '#10b981' }}>{stats.best.month?.slice(0, 3)} · +{stats.best.avg_gain_pct?.toFixed(2)}%</span>
                </div>
                <div style={statCard}>
                  <span style={statLabel}><ArrowDownCircle size={12} /> Weakest Month</span>
                  <span style={{ ...statValue, color: stats.worst.avg_gain_pct >= 0 ? '#10b981' : '#f43f5e' }}>
                    {stats.worst.month?.slice(0, 3)} · {stats.worst.avg_gain_pct >= 0 ? '+' : ''}{stats.worst.avg_gain_pct?.toFixed(2)}%
                  </span>
                </div>
                <div style={statCard}>
                  <span style={statLabel}><TrendingUp size={12} /> Avg / Month</span>
                  <span style={{ ...statValue, color: stats.avg >= 0 ? '#10b981' : '#f43f5e' }}>{stats.avg >= 0 ? '+' : ''}{stats.avg.toFixed(2)}%</span>
                </div>
                <div style={statCard}>
                  <span style={statLabel}><ArrowUpCircle size={12} /> Positive Months</span>
                  <span style={statValue}>{stats.positive} / {stats.total}</span>
                </div>
              </div>
            )}

            <div className="mr-table-scroll">
              <table style={{ width: '100%', minWidth: 560, fontSize: '0.82rem', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={thStyle}>Month</th>
                    <th style={{ ...thStyle, minWidth: 180 }}>Avg Gain</th>
                    <th style={thStyle}>Buy</th>
                    <th style={thStyle}>Sell</th>
                    {analyzedMode === 'Subha Muhurta' && <th style={thStyle}>Muhurta</th>}
                  </tr>
                </thead>
                <tbody>
                  {tickerCal.map((r, i) => {
                    const gain = r.avg_gain_pct;
                    const pos = gain != null && gain >= 0;
                    const isBest = stats && r === stats.best && gain != null;
                    const barPct = gain != null && stats ? Math.min(Math.abs(gain) / stats.maxAbs * 100, 100) : 0;
                    return (
                      <tr
                        key={i}
                        style={{ background: isBest ? 'rgba(16,185,129,0.06)' : 'transparent', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { if (!isBest) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (!isBest) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#e2e8f0' }}>
                          {r.month}
                          {isBest && <Sparkles size={12} color="#10b981" style={{ marginLeft: 6, verticalAlign: 'middle' }} />}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              minWidth: 62, fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                              color: gain == null ? '#64748b' : pos ? '#10b981' : '#f43f5e',
                            }}>
                              {gain == null ? '—' : `${pos ? '+' : ''}${gain.toFixed(2)}%`}
                            </span>
                            <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                              <div style={{
                                width: `${barPct}%`, height: '100%', borderRadius: 4,
                                background: pos ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#e11d48,#fb7185)',
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                          {r.buy_date}{r.buy_weekday ? <span style={{ color: '#64748b' }}> ({r.buy_weekday})</span> : ''}
                        </td>
                        <td style={{ ...tdStyle, color: '#f43f5e', fontVariantNumeric: 'tabular-nums' }}>
                          {r.sell_date}{r.sell_weekday ? <span style={{ color: '#64748b' }}> ({r.sell_weekday})</span> : ''}
                        </td>
                        {analyzedMode === 'Subha Muhurta' && (
                          <td style={{ ...tdStyle, color: '#94a3b8' }}>
                            {r.muhurta_dates && r.muhurta_dates !== 'N/A' ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {r.muhurta_dates.split(',').map((d, j) => (
                                  <span key={j} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600 }}>
                                    {d.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                        )}
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
