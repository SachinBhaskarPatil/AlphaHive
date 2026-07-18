const KEY_PREFIX = 'mr_shadow_history_';

function findForensicReport(reports, ticker) {
  const short = String(ticker).replace(/\.(NS|BO)$/i, '');
  return (reports || []).find((f) => (
    f.ticker === ticker
    || f.ticker === short
    || String(f.ticker || '').replace(/\.(NS|BO)$/i, '') === short
  ));
}

function stanceFromSignals(match, intent, forensic) {
  if (forensic?.status === 'CRITICAL' || forensic?.status === 'CAUTION') return 'WARNING';
  if (!match) return intent || 'NEUTRAL';
  const upper = String(match).toUpperCase();
  if (upper.includes('ABSORPTION') || upper.includes('ACCUMULATION')) return 'ACCUMULATION';
  if (upper.includes('DISTRIBUTION')) return 'DISTRIBUTION';
  if (upper.includes('FORENSIC') || upper.includes('WARNING') || upper.includes('GHOST')) return 'WARNING';
  return intent !== 'NEUTRAL' ? intent : 'NEUTRAL';
}

function buildLogicSummary({ match, regime, intent, forensic }) {
  if (match) return match;
  if (forensic?.status === 'CRITICAL') {
    return `Forensic CRITICAL (${forensic.red_flags || 0} flags): ${forensic.summary || 'Review required.'}`;
  }
  if (forensic?.status === 'CAUTION') {
    return `Forensic CAUTION: ${forensic.summary || 'Review recommended.'}`;
  }
  const parts = [`Analyzed in ${regime} regime.`];
  if (intent && intent !== 'NEUTRAL') parts.push(`Intent: ${intent}.`);
  if (forensic) {
    parts.push(`Forensic: ${forensic.status || 'HEALTHY'}.`);
    if (forensic.red_flags) parts.push(`${forensic.red_flags} flag(s).`);
    else if (forensic.summary) parts.push(forensic.summary);
  }
  return parts.join(' ');
}

export function dedupeShadowSignals(signals = []) {
  const byTicker = new Map();
  signals.forEach((s) => {
    if (!s?.ticker) return;
    const key = String(s.ticker).toUpperCase();
    const prev = byTicker.get(key);
    const prevDate = prev?.analysis_date ? Date.parse(prev.analysis_date) : 0;
    const nextDate = s.analysis_date ? Date.parse(s.analysis_date) : 0;
    if (!prev || nextDate >= prevDate) byTicker.set(key, s);
  });
  return [...byTicker.values()].sort((a, b) => {
    const ad = a.analysis_date ? Date.parse(a.analysis_date) : 0;
    const bd = b.analysis_date ? Date.parse(b.analysis_date) : 0;
    return bd - ad;
  });
}

export function saveShadowHistory(handle, tickers, result) {
  if (!handle || !tickers?.length) return;
  const intent = result?.institutional_intent || 'NEUTRAL';
  const regime = result?.regime || 'NEUTRAL';
  const shadowSignals = result?.shadow_signals || [];
  const forensicReports = result?.forensic_reports || [];
  const now = new Date().toISOString();

  const entries = tickers.map((ticker) => {
    const short = String(ticker).replace(/\.(NS|BO)$/i, '');
    const match = shadowSignals.find((sig) => (
      String(sig).includes(ticker) || String(sig).includes(short)
    ));
    const forensic = findForensicReport(forensicReports, ticker);
    return {
      ticker,
      stance: stanceFromSignals(match, intent, forensic),
      logic_summary: buildLogicSummary({ match, regime, intent, forensic }),
      analysis_date: now,
      source: 'session',
    };
  });

  try {
    const existing = loadShadowHistory(handle);
    const merged = dedupeShadowSignals([...entries, ...existing]).slice(0, 40);
    sessionStorage.setItem(`${KEY_PREFIX}${handle}`, JSON.stringify(merged));
  } catch {
    /* ignore quota errors */
  }
}

export function loadShadowHistory(handle) {
  if (!handle) return [];
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${handle}`);
    return raw ? dedupeShadowSignals(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}
