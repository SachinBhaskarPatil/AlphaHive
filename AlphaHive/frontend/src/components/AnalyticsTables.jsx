function shortLabel(ticker) {
  return String(ticker || '').replace(/\.(NS|BO)$/i, '');
}

function cleanWarning(text) {
  return String(text || '').replace(/\*\*/g, '').replace(/^⚠️\s*/, '').trim();
}

const ACTION_STYLE = {
  Buy: { bg: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: 'rgba(16,185,129,0.4)' },
  Sell: { bg: 'rgba(244,63,94,0.2)', color: '#fda4af', border: 'rgba(244,63,94,0.4)' },
  Hold: { bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1', border: 'rgba(148,163,184,0.3)' },
};

function pct(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(Number(v) * 100).toFixed(1)}%`;
}

export function DataNotes({ warnings }) {
  if (!warnings?.length) return null;
  const unique = [...new Set(warnings.map(cleanWarning))].filter(Boolean);
  if (!unique.length) return null;

  return (
    <div style={{
      marginBottom: 14, padding: '12px 14px', borderRadius: 10,
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', marginBottom: 8 }}>DATA NOTES</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.72rem', color: '#fcd34d', lineHeight: 1.5 }}>
        {unique.map((w, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

export function RebalanceTable({ rows, compact = false }) {
  if (!rows?.length) return null;

  return (
    <div className="mr-scroll mr-table-scroll" style={{ overflowX: 'auto', maxHeight: compact ? 420 : undefined, overflowY: compact ? 'auto' : undefined }}>
      <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)' }}>
            {['Ticker', 'Company', 'Current', 'Target', 'Action', 'Reason'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 8px',
                  textAlign: h === 'Current' || h === 'Target' ? 'right' : 'left',
                  color: '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const action = r.action || 'Hold';
            const actionStyle = ACTION_STYLE[action] || ACTION_STYLE.Hold;
            return (
              <tr key={r.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                  {shortLabel(r.symbol)}
                </td>
                <td style={{ padding: '10px 8px', color: '#94a3b8', minWidth: 100, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>
                  {r.name}
                </td>
                <td style={{ padding: '10px 8px', color: '#e2e8f0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                  {pct(r.current_weight)}
                </td>
                <td style={{ padding: '10px 8px', color: '#e2e8f0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                  {pct(r.target_weight)}
                </td>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    background: actionStyle.bg,
                    color: actionStyle.color,
                    border: `1px solid ${actionStyle.border}`,
                  }}
                  >
                    {action}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.45, minWidth: 160, maxWidth: 240 }}>
                  {r.comment}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Keep for Analytics tab
export function CorrelationMatrixTable({ matrix }) {
  if (!matrix || typeof matrix !== 'object' || !Object.keys(matrix).length) return null;

  const labels = Object.keys(matrix);
  const short = labels.map(shortLabel);

  const tableMinWidth = Math.max(480, labels.length * 56 + 80);

  return (
    <div className="mr-scroll mr-table-scroll" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: tableMinWidth, borderCollapse: 'separate', borderSpacing: 4, fontSize: '0.78rem' }}>
        <thead>
          <tr>
            <th style={{ padding: 8, color: '#64748b', textAlign: 'left' }} />
            {short.map((l) => (
              <th key={l} style={{ padding: 8, color: '#94a3b8', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowKey, ri) => (
            <tr key={rowKey}>
              <td style={{ padding: 8, color: '#94a3b8', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }}>
                {short[ri]}
              </td>
              {labels.map((colKey) => {
                const val = matrix[rowKey]?.[colKey];
                const v = val != null ? Math.max(-1, Math.min(1, val)) : null;
                const intensity = v != null ? Math.abs(v) : 0;
                const bg = v == null ? 'rgba(255,255,255,0.02)'
                  : v >= 0 ? `rgba(244,63,94,${0.15 + intensity * 0.5})` : `rgba(59,130,246,${0.15 + intensity * 0.5})`;
                return (
                  <td
                    key={`${rowKey}-${colKey}`}
                    style={{
                      padding: '6px 8px', textAlign: 'center', borderRadius: 6, fontWeight: 700,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                      background: bg, color: '#f1f5f9',
                    }}
                  >
                    {val != null ? Number(val).toFixed(2) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
