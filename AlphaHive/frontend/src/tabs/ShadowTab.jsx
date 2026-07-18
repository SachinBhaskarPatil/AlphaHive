import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw } from 'lucide-react';
import { GlassCard, SectionHeader, Badge, LoadingBlock } from '../components/Shared';
import { PageShell } from '../components/AIExperience';
import TickerAutocomplete from '../components/TickerAutocomplete';
import { shadowApi, marketApi } from '../api';
import { loadShadowHistory, dedupeShadowSignals } from '../utils/shadowHistory';

const TABS = ['History', 'Sector Flow', 'FII Trap', 'Stock Scan'];
const STOCK_CATEGORIES = ['Nifty 50', 'Nifty Next 50', 'Midcap', 'All'];
const BRAND_CATEGORIES = ['Nifty 50', 'Nifty Next 50', 'Midcap'];

const STANCE_COLOR = {
  ACCUMULATION: '#10b981',
  DISTRIBUTION: '#f43f5e',
  WARNING: '#f59e0b',
  NEUTRAL: '#94a3b8',
  COMPLETED: '#22d3ee',
};

function normalizeTicker(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s.startsWith('^') || s.includes('.')) return s;
  return `${s}.NS`;
}

function scoreLabel(score) {
  if (score == null) return '—';
  if (score > 60) return 'Accumulation likely';
  if (score < 30) return 'No accumulation signs';
  return 'Neutral / inconclusive';
}

function formatAnalysisDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).split('T')[0];
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ShadowTab({ handle, onNavigate }) {
  const [tab, setTab] = useState('History');
  const [signals, setSignals] = useState([]);
  const [historySource, setHistorySource] = useState('user');
  const [sectors, setSectors] = useState([]);
  const [trap, setTrap] = useState(null);
  const [scanTicker, setScanTicker] = useState('TCS');
  const [scanResult, setScanResult] = useState(null);
  const [stockCategory, setStockCategory] = useState('Nifty 50');
  const [categoryTickers, setCategoryTickers] = useState([]);
  const [brandMetaMap, setBrandMetaMap] = useState({});
  const [sectorName, setSectorName] = useState('Financial Services');
  const [sectorOptions, setSectorOptions] = useState(['Financial Services']);
  const [sectorStocks, setSectorStocks] = useState([]);
  const [sectorNote, setSectorNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [scannedSymbol, setScannedSymbol] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(BRAND_CATEGORIES.map((c) => marketApi.tickers(c)))
      .then((responses) => {
        const map = {};
        responses.forEach(({ data }) => {
          (data.tickers || []).forEach((t) => { map[t.ticker] = t; });
        });
        setBrandMetaMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (stockCategory === 'All') {
      Promise.all(BRAND_CATEGORIES.map((c) => marketApi.tickers(c)))
        .then((responses) => {
          const merged = [];
          const seen = new Set();
          responses.forEach(({ data }) => {
            (data.tickers || []).forEach((t) => {
              const short = t.ticker_short || t.ticker.split('.')[0];
              if (!seen.has(short)) {
                seen.add(short);
                merged.push(t);
              }
            });
          });
          setCategoryTickers(merged.sort((a, b) => {
            const as = (a.ticker_short || a.ticker.split('.')[0]).toUpperCase();
            const bs = (b.ticker_short || b.ticker.split('.')[0]).toUpperCase();
            return as.localeCompare(bs);
          }));
        })
        .catch(() => setCategoryTickers([]));
    } else {
      marketApi.tickers(stockCategory)
        .then((r) => {
          const list = (r.data.tickers || []).sort((a, b) => {
            const as = (a.ticker_short || a.ticker.split('.')[0]).toUpperCase();
            const bs = (b.ticker_short || b.ticker.split('.')[0]).toUpperCase();
            return as.localeCompare(bs);
          });
          setCategoryTickers(list);
        })
        .catch(() => setCategoryTickers([]));
    }
  }, [stockCategory]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const sessionSignals = loadShadowHistory(handle);
      const { data } = await shadowApi.user(handle);
      const userSignals = dedupeShadowSignals(data.shadow_signals || []);
      if (userSignals.length) {
        setSignals(userSignals);
        setHistorySource('user');
      } else if (sessionSignals.length) {
        setSignals(sessionSignals);
        setHistorySource('session');
      } else {
        const market = await shadowApi.market();
        const marketSignals = dedupeShadowSignals(market.data.shadow_signals || []);
        if (marketSignals.length) {
          setSignals(marketSignals);
          setHistorySource('market');
        } else {
          setSignals([]);
          setHistorySource('empty');
        }
      }
    } catch (e) {
      const sessionSignals = loadShadowHistory(handle);
      if (sessionSignals.length) {
        setSignals(sessionSignals);
        setHistorySource('session');
      } else {
        setError(e.response?.data?.error || 'Could not load shadow history.');
        setSignals([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSectorFlow = async () => {
    setLoading(true);
    setError('');
    setSectorStocks([]);
    setSectorNote('');
    try {
      const [flowRes, sectorsRes] = await Promise.all([
        shadowApi.sectorFlow(),
        shadowApi.sectors(),
      ]);
      const list = flowRes.data.sectors || [];
      setSectors(list);
      const opts = sectorsRes.data.sectors || [];
      if (opts.length) {
        setSectorOptions(opts);
        if (!opts.includes(sectorName)) {
          setSectorName(opts[0]);
        }
      }
      if (!list.length) setError(flowRes.data.message || 'No sector flow data available.');
    } catch (e) {
      setError(e.response?.data?.error || 'Sector flow unavailable.');
      setSectors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrap = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await shadowApi.trap();
      if (data?.error) throw new Error(data.error);
      setTrap(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'FII trap indicator unavailable.');
      setTrap(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setError('');
    if (tab === 'History') loadHistory();
    if (tab === 'Sector Flow') loadSectorFlow();
    if (tab === 'FII Trap') loadTrap();
    if (tab === 'Stock Scan') {
      setScanResult(null);
      setError('');
    }
  }, [tab, handle]);

  const loadSector = async () => {
    setSectorLoading(true);
    setSectorNote('');
    setSectorStocks([]);
    try {
      const { data } = await shadowApi.sector(sectorName);
      const stocks = data.stocks || [];
      setSectorStocks(stocks);
      if (!stocks.length) {
        setSectorNote(`No Nifty 50 stocks mapped to “${sectorName}”. Try Energy (includes power utilities), IT, or Financial Services.`);
      }
    } catch (e) {
      setSectorNote(e.response?.data?.error || 'Sector deep-dive failed. Try again in a moment.');
    } finally {
      setSectorLoading(false);
    }
  };

  const runScan = async () => {
    const sym = normalizeTicker(scanTicker);
    if (!sym) {
      setError('Enter a valid ticker symbol.');
      return;
    }
    setScanLoading(true);
    setError('');
    setScanResult(null);
    try {
      const { data } = await shadowApi.stock(sym);
      if (data?.error) throw new Error(data.error);
      setScannedSymbol((data.ticker || sym).replace(/\.(NS|BO)$/i, ''));
      setScanResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Stock scan failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const retry = () => {
    if (tab === 'History') loadHistory();
    else if (tab === 'Sector Flow') loadSectorFlow();
    else if (tab === 'FII Trap') loadTrap();
  };

  const openStockScan = (ticker) => {
    const short = String(ticker || '').replace(/\.(NS|BO)$/i, '');
    setScanTicker(short);
    setScanResult(null);
    setScannedSymbol('');
    setError('');
    setTab('Stock Scan');
  };

  return (
    <PageShell>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader icon={<Eye size={24} color="#a78bfa" />} title="Shadow Tracker" sub="Institutional footprints — live tools + history" />

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
            color: tab === t ? '#a78bfa' : '#94a3b8', fontWeight: 700,
          }}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <GlassCard style={{ marginBottom: '1rem', border: '1px solid rgba(244,63,94,0.3)' }}>
          <p style={{ color: '#f43f5e', marginBottom: 10 }}>{error}</p>
          <button type="button" onClick={retry} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer',
          }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </GlassCard>
      )}

      {loading && tab !== 'Stock Scan' && (
        <GlassCard style={{ marginBottom: '1rem' }}>
          <LoadingBlock label={`Loading ${tab}…`} color="#a78bfa" />
        </GlassCard>
      )}

      {tab === 'History' && !loading && (
        signals.length === 0 ? (
          <GlassCard style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <p style={{ marginBottom: '1rem' }}>No shadow signals in history yet.</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Run <strong style={{ color: '#c4b5fd' }}>Run Intelligence</strong> in Market Analysis Hub
              or <strong style={{ color: '#c4b5fd' }}>Analyze Risk</strong> in Portfolio — then return here.
              Even without a database, this browser remembers results until you sign out or close the tab.
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'rgba(167,139,250,0.2)', color: '#c4b5fd', fontWeight: 700,
                }}
              >
                Go to Market Analysis Hub →
              </button>
            )}
          </GlassCard>
        ) : (
          <>
            <GlassCard style={{
              marginBottom: '0.75rem', padding: '10px 14px',
              background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {historySource === 'session' && 'Showing stances from your recent analysis this browser session.'}
                  {historySource === 'market' && 'Showing latest community batch stances (no personal history yet). Tap a card to run a live stock scan.'}
                  {historySource === 'user' && 'Your saved stance history from intelligence runs.'}
                </p>
                <button type="button" onClick={loadHistory} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                  borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
            </GlassCard>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {signals.map((s, i) => (
                <GlassCard
                  key={`${s.ticker}-${s.analysis_date || i}`}
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => openStockScan(s.ticker)}
                  onKeyDown={(e) => e.key === 'Enter' && openStockScan(s.ticker)}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ color: '#22d3ee' }}>{s.ticker}</strong>
                    <Badge text={s.stance} color={STANCE_COLOR[s.stance] || '#94a3b8'} />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.45 }}>{s.logic_summary}</p>
                  {s.analysis_date && (
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 8 }}>
                      {formatAnalysisDate(s.analysis_date)}
                      <span style={{ marginLeft: 8, color: '#7c3aed' }}>→ Live scan</span>
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>
          </>
        )
      )}

      {tab === 'Sector Flow' && !loading && (
        <GlassCard>
          <h3 style={{ marginBottom: '1rem' }}>Spider Web — Sector Rotation</h3>
          {sectors.length ? (
            <div className="mr-table-scroll">
            <table style={{ width: '100%', minWidth: 320, fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }}>Rank</th>
                  <th style={{ textAlign: 'left' }}>Sector</th>
                  <th style={{ textAlign: 'left' }}>Momentum</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 0' }}>{s.Rank}</td>
                    <td>{s.Sector}</td>
                    <td>{typeof s['Momentum Score'] === 'number' ? s['Momentum Score'].toFixed(1) : s['Momentum Score']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : !error && <p style={{ color: '#64748b' }}>No sector data</p>}

          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Sector deep-dive (Nifty 50 stocks only — power names like NTPC are under <strong style={{ color: '#94a3b8' }}>Energy</strong>)
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={sectorName}
                onChange={(e) => { setSectorName(e.target.value); setSectorStocks([]); setSectorNote(''); }}
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              >
                {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" onClick={loadSector} disabled={sectorLoading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: 'white', cursor: 'pointer' }}>
                {sectorLoading ? 'Loading...' : 'Sector Deep-Dive'}
              </button>
            </div>
          </div>

          {sectorNote && (
            <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.45 }}>{sectorNote}</p>
          )}

          {sectorStocks.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              {sectorStocks.slice(0, 15).map((s, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem' }}>
                  <strong style={{ color: '#e2e8f0' }}>{s.Symbol}</strong>
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                    Shadow score: {s['Shadow Score'] ?? '—'}/100
                  </span>
                  {s.Signals && <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{s.Signals}</p>}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {tab === 'FII Trap' && !loading && (
        trap ? (
          <GlassCard>
            <h3>FII Index Long %</h3>
            {trap.status === 'Error' || trap.status === 'Unknown' ? (
              <>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>Data not available right now</p>
                <Badge text={trap.status} color="#f59e0b" />
                <p style={{ marginTop: '1rem', color: '#94a3b8', lineHeight: 1.5 }}>{trap.message}</p>
                <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b' }}>
                  FII positioning is pulled from NSE derivatives stats on the last trading session (skips weekends/holidays).
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: trap.fii_long_pct > 70 ? '#f59e0b' : '#10b981' }}>
                  {trap.fii_long_pct}%
                </p>
                <Badge text={trap.status} />
                {trap.trade_date && (
                  <p style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>As of {trap.trade_date}</p>
                )}
                <p style={{ marginTop: '1rem', color: '#94a3b8' }}>{trap.message}</p>
                {trap.fii_long_pct > 70 && (
                  <p style={{ marginTop: 12, color: '#fbbf24', fontSize: '0.85rem' }}>Bull trap zone — positioning stretched long.</p>
                )}
                {trap.fii_long_pct < 30 && (
                  <p style={{ marginTop: 12, color: '#10b981', fontSize: '0.85rem' }}>Bear trap zone — positioning stretched short.</p>
                )}
              </>
            )}
          </GlassCard>
        ) : !error && (
          <GlassCard><p style={{ color: '#64748b' }}>FII trap data unavailable.</p></GlassCard>
        )
      )}

      {tab === 'Stock Scan' && (
        <GlassCard>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
            Search any Nifty stock — accumulation score + recent block deals
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {STOCK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setStockCategory(cat)}
                style={{
                  padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 700,
                  background: stockCategory === cat ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                  color: stockCategory === cat ? '#c4b5fd' : '#94a3b8',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="mr-form-row shadow-scan-row" style={{ marginBottom: '1rem' }}>
            <TickerAutocomplete
              value={scanTicker}
              onChange={setScanTicker}
              brands={brandMetaMap}
              allowMultiple={false}
              onEnter={runScan}
              placeholder="Search — TCS, RELIANCE, INFY..."
            />
            <button type="button" className="btn-primary" onClick={runScan} disabled={scanLoading} style={{ minHeight: 48, opacity: scanLoading ? 0.7 : 1 }}>
              {scanLoading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          {categoryTickers.length > 0 && (
            <>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>
                {categoryTickers.length} stocks in {stockCategory} — scroll for more
              </p>
              <div className="mr-scroll" style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 200,
                overflowY: 'auto', marginBottom: '1rem', paddingRight: 4,
              }}
              >
                {categoryTickers.map((t) => {
                const short = t.ticker_short || t.ticker.split('.')[0];
                return (
                  <button
                    key={t.ticker}
                    type="button"
                    onClick={() => setScanTicker(short)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                      border: scanTicker === short ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      background: scanTicker === short ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                      color: scanTicker === short ? '#c4b5fd' : '#94a3b8',
                    }}
                  >
                    {short}
                  </button>
                );
              })}
              </div>
            </>
          )}
          {scanResult && (
            <div style={{
              marginTop: 8, paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            >
              <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, marginBottom: 6 }}>
                {scannedSymbol || scanTicker}
              </p>
              <div style={{
                height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)',
                marginBottom: 12, overflow: 'hidden',
              }}
              >
                <div style={{
                  width: `${Math.min(100, scanResult.accumulation?.score ?? 0)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: (scanResult.accumulation?.score ?? 0) > 60 ? '#10b981'
                    : (scanResult.accumulation?.score ?? 0) < 30 ? '#f43f5e' : '#fbbf24',
                }}
                />
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>
                Shadow score: {scanResult.accumulation?.score ?? '—'}/100
              </p>
              <p style={{ color: '#94a3b8', marginBottom: 12 }}>
                {scoreLabel(scanResult.accumulation?.score)}
              </p>
              {(scanResult.accumulation?.signals || []).length > 0 ? (
                (scanResult.accumulation?.signals || []).map((sig, i) => (
                  <p key={i} style={{ fontSize: '0.82rem', color: '#6ee7b7', marginBottom: 4 }}>• {sig}</p>
                ))
              ) : (
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>No accumulation patterns detected in the last month.</p>
              )}
              {scanResult.block_deals?.length > 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontWeight: 700, marginBottom: 8 }}>Recent block deals</p>
                  {scanResult.block_deals.slice(0, 8).map((b, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px', marginBottom: 6, borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: `4px solid ${b.Type === 'BUY' ? '#10b981' : '#f43f5e'}`,
                        fontSize: '0.8rem', color: '#94a3b8',
                      }}
                    >
                      <strong style={{ color: '#e2e8f0' }}>{b.Symbol}</strong> · {b.Date}
                      <br />
                      {b.Type} @ ₹{b.Price} ({b.Qty}) — {b.Client}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b' }}>No recent block deals found.</p>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </motion.div>
    </PageShell>
  );
}
