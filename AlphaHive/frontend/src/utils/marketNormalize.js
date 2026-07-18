/** Normalize API records so UI never shows fake "Sector 1" / default mood labels. */

export function normalizeSectorRecord(row) {
  if (!row || typeof row !== 'object') return null;
  const name = String(row.sector ?? row.name ?? row.Sector ?? '').trim();
  if (!name) return null;

  const momentum = row.flow ?? row.net_flow ?? row['Momentum Score'];
  const weekPct = row['1W %'];

  let flow = null;
  if (typeof momentum === 'number' && !Number.isNaN(momentum)) flow = momentum;
  else if (typeof weekPct === 'number' && !Number.isNaN(weekPct)) flow = weekPct;

  return {
    sector: name,
    name,
    flow,
    trend: row.trend ?? (typeof weekPct === 'number' ? `${weekPct >= 0 ? '+' : ''}${weekPct.toFixed(1)}% (1W)` : null),
    raw: row,
  };
}

export function normalizeSectorList(list) {
  return (list || []).map(normalizeSectorRecord).filter(Boolean);
}

function formatSignalDate(raw) {
  if (!raw) return 'Recent';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).split('T')[0];
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function deriveShadowSummary(shadowData) {
  const signals = shadowData?.shadow_signals || shadowData?.signals || [];
  if (!Array.isArray(signals) || signals.length === 0) {
    return { mood: null, intent: null, activityItems: [], signalCount: 0 };
  }

  const stances = signals
    .map((s) => (typeof s === 'string' ? '' : String(s.stance || '').toUpperCase()))
    .filter(Boolean);

  const accum = stances.filter((s) => s.includes('ACCUM')).length;
  const distrib = stances.filter((s) => s.includes('DISTRIB')).length;

  let intent = null;
  if (accum > distrib && accum > 0) intent = 'ACCUMULATION';
  else if (distrib > accum && distrib > 0) intent = 'DISTRIBUTION';
  else if (stances.some((s) => s.includes('WARNING'))) intent = 'WARNING';
  else if (stances.length) intent = 'NEUTRAL';

  const activityItems = signals.slice(0, 8).map((s, i) => {
    if (typeof s === 'string') {
      return { id: `sig-${i}`, message: s, time: 'Recent' };
    }
    const ticker = String(s.ticker || 'Market').replace(/\.(NS|BO)$/i, '');
    const detail = s.logic_summary || s.stance || 'Shadow signal';
    return {
      id: s.ticker || `sig-${i}`,
      message: `${ticker}: ${detail}`,
      time: formatSignalDate(s.analysis_date),
    };
  });

  return {
    mood: `${signals.length} shadow signal${signals.length === 1 ? '' : 's'}`,
    intent,
    activityItems,
    signalCount: signals.length,
  };
}

export function displayValue(value, empty = '—') {
  if (value === null || value === undefined || value === '') return empty;
  return value;
}

/** Indian locale price formatting for stocks and indices. */
export function formatInr(value, { decimals = 2, compact = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (compact && Math.abs(n) >= 100000) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPct(value, { signed = true, decimals = 1 } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const prefix = signed && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(decimals)}%`;
}

/** Strip exchange suffix and leading index caret for display. */
export function displayTickerLabel(raw, fallbackName = '') {
  const s = String(raw || '').trim();
  if (!s) return fallbackName || '—';
  if (fallbackName && !fallbackName.startsWith('^')) return fallbackName.split(' (')[0].trim();
  return s.replace(/\.(NS|BO)$/i, '').replace(/^\^/, '');
}
