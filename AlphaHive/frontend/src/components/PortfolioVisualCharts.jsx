import Plot from 'react-plotly.js';

const PLOT_BG = 'rgba(15,23,42,0.35)';
const PAPER_BG = 'rgba(0,0,0,0)';
const FONT = { color: '#94a3b8', family: 'Inter, sans-serif' };

const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: false,
  displaylogo: false,
};

function riskColor(score) {
  if (score < 30) return '#10b981';
  if (score < 70) return '#fbbf24';
  return '#f43f5e';
}

export function RiskBarChart({ stockRiskData = [] }) {
  if (!stockRiskData.length) return null;
  const symbols = stockRiskData.map((s) => s.symbol);
  const scores = stockRiskData.map((s) => s.risk_score);
  const colors = scores.map(riskColor);
  const maxScore = Math.max(...scores, 1);
  const yMax = Math.min(100, Math.ceil(maxScore / 10) * 10 + 12);

  return (
    <Plot
      data={[{
        type: 'bar',
        x: symbols,
        y: scores,
        marker: { color: colors, line: { color: '#1e293b', width: 1 } },
        text: scores.map((s) => `${s}`),
        textposition: 'outside',
        textfont: {
          size: 14,
          family: 'JetBrains Mono, monospace',
          color: '#f8fafc',
        },
        cliponaxis: false,
        hovertemplate: '<b>%{x}</b><br>Risk Score: %{y}<extra></extra>',
      }]}
      layout={{
        title: { text: 'Portfolio Risk Scores', font: { color: '#e2e8f0', size: 14 }, x: 0 },
        paper_bgcolor: PAPER_BG,
        plot_bgcolor: PLOT_BG,
        font: FONT,
        height: Math.max(380, 280 + symbols.length * 4),
        margin: { l: 52, r: 12, t: 56, b: symbols.length > 5 ? 88 : 56 },
        yaxis: {
          title: { text: 'Risk Score (0-100)', font: { color: '#94a3b8', size: 11 } },
          range: [0, yMax],
          gridcolor: 'rgba(255,255,255,0.08)',
          tickfont: { color: '#94a3b8', size: 11 },
          zeroline: false,
        },
        xaxis: {
          tickfont: { color: '#e2e8f0', size: 10, family: 'JetBrains Mono, monospace' },
          tickangle: symbols.length > 4 ? -40 : 0,
          automargin: true,
        },
        bargap: 0.25,
        shapes: [
          { type: 'line', y0: 30, y1: 30, xref: 'paper', x0: 0, x1: 1, line: { dash: 'dash', color: '#475569', width: 1 } },
          { type: 'line', y0: 70, y1: 70, xref: 'paper', x0: 0, x1: 1, line: { dash: 'dash', color: '#475569', width: 1 } },
        ],
        annotations: [
          { x: 1, y: 30, xref: 'paper', yref: 'y', text: 'Low', showarrow: false, font: { size: 9, color: '#64748b' }, xanchor: 'right' },
          { x: 1, y: 70, xref: 'paper', yref: 'y', text: 'High', showarrow: false, font: { size: 9, color: '#64748b' }, xanchor: 'right' },
        ],
      }}
      config={PLOT_CONFIG}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );
}

export function CorrelationHeatmapChart({ matrix }) {
  if (!matrix || !Object.keys(matrix).length) return null;
  const labels = Object.keys(matrix);
  const short = labels.map((l) => l.replace(/\.(NS|BO)$/i, ''));
  const z = labels.map((row) => labels.map((col) => {
    const v = matrix[row]?.[col];
    return v == null || Number.isNaN(Number(v)) ? null : Number(v);
  }));
  const n = short.length;
  const fontSize = n > 14 ? 7 : n > 10 ? 8 : n > 8 ? 9 : 10;
  const text = [...z].reverse().map((row) => row.map((v) => (v != null ? v.toFixed(2) : '')));

  return (
    <Plot
      data={[{
        type: 'heatmap',
        x: short,
        y: [...short].reverse(),
        z: [...z].reverse(),
        zmin: -1,
        zmax: 1,
        colorscale: [
          [0, '#1d4ed8'],
          [0.5, '#1e293b'],
          [1, '#dc2626'],
        ],
        colorbar: {
          title: { text: 'Corr', font: { color: '#94a3b8', size: 10 } },
          tickfont: { color: '#94a3b8', size: 10 },
          thickness: 12,
          len: 0.75,
        },
        text,
        texttemplate: '%{text}',
        textfont: { size: fontSize, color: '#f8fafc', family: 'JetBrains Mono, monospace' },
        hovertemplate: '%{y} vs %{x}<br>Correlation: %{z:.2f}<extra></extra>',
      }]}
      layout={{
        title: { text: 'Correlation Heatmap', font: { color: '#e2e8f0', size: 14 }, x: 0 },
        paper_bgcolor: PAPER_BG,
        plot_bgcolor: PLOT_BG,
        font: FONT,
        height: Math.max(360, n * 32 + 140),
        margin: { l: n > 6 ? 100 : 80, r: 56, t: 52, b: n > 6 ? 110 : 80 },
        xaxis: {
          tickfont: { size: n > 8 ? 8 : 10, color: '#cbd5e1', family: 'JetBrains Mono, monospace' },
          tickangle: -45,
          side: 'bottom',
        },
        yaxis: {
          tickfont: { size: n > 8 ? 8 : 10, color: '#cbd5e1', family: 'JetBrains Mono, monospace' },
          autorange: 'reversed',
        },
      }}
      config={PLOT_CONFIG}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );
}

export function RiskGaugeChart({ symbol, riskScore }) {
  const color = riskColor(riskScore);
  const band = riskScore < 30 ? 'Low' : riskScore < 70 ? 'Moderate' : 'High';
  const tip = `${symbol}: ${riskScore} / 100 (${band} risk)`;
  return (
    <div
      className="risk-gauge"
      style={{ textAlign: 'center' }}
      title={tip}
      aria-label={tip}
    >
      <Plot
        data={[{
          type: 'indicator',
          mode: 'gauge+number',
          value: riskScore,
          number: {
            font: { size: 28, color: '#f8fafc', family: 'JetBrains Mono, monospace' },
            suffix: '',
          },
          title: { text: symbol, font: { size: 12, color: '#e2e8f0', family: 'JetBrains Mono, monospace' } },
          gauge: {
            axis: {
              range: [0, 100],
              tickmode: 'linear',
              tick0: 0,
              dtick: 25,
              tickcolor: '#64748b',
              tickfont: { color: '#94a3b8', size: 9 },
            },
            bar: { color, thickness: 0.7 },
            bgcolor: 'rgba(255,255,255,0.06)',
            borderwidth: 0,
            steps: [
              { range: [0, 30], color: 'rgba(16,185,129,0.35)' },
              { range: [30, 70], color: 'rgba(251,191,36,0.35)' },
              { range: [70, 100], color: 'rgba(244,63,94,0.35)' },
            ],
          },
          hovertemplate: `<b>${symbol}</b><br>Risk score: <b>${riskScore}</b> / 100<br>${band}<extra></extra>`,
        }]}
        layout={{
          paper_bgcolor: PAPER_BG,
          plot_bgcolor: PAPER_BG,
          height: 200,
          margin: { l: 28, r: 28, t: 48, b: 8 },
          hovermode: 'closest',
          hoverlabel: {
            bgcolor: '#0f172a',
            bordercolor: color,
            font: { color: '#f8fafc', size: 12, family: 'JetBrains Mono, monospace' },
          },
        }}
        config={PLOT_CONFIG}
        style={{ width: '100%' }}
        useResizeHandler
      />
      <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: -4 }}>Risk score</p>
      <span className="risk-gauge__tip" role="tooltip">{tip}</span>
    </div>
  );
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
  neutral: '#94a3b8',
};

function SentimentTickerList({ byTicker }) {
  if (!byTicker.length) return null;
  return (
    <ul className="sentiment-panel__list">
      {byTicker.map(({ sym, sentiment }) => (
        <li key={sym}>
          <span className="sentiment-panel__ticker">{sym}</span>
          <span className="sentiment-panel__pill" style={{ color: SENTIMENT_COLORS[sentiment] }}>
            {sentiment}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SentimentPieChart({ sentimentData = [] }) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  const byTicker = [];
  sentimentData.forEach((s) => {
    const k = (s.sentiment || 'neutral').toLowerCase();
    const bucket = k in counts ? k : 'neutral';
    counts[bucket] += 1;
    const sym = String(s.ticker || s.symbol || '').replace(/\.(NS|BO)$/i, '');
    if (sym) byTicker.push({ sym, sentiment: bucket });
  });
  const labels = Object.keys(counts).filter((k) => counts[k] > 0);
  if (!labels.length) return null;

  const allNeutral = labels.length === 1 && labels[0] === 'neutral';
  const summaryParts = labels.map((l) => `${counts[l]} ${l}`);

  if (allNeutral && byTicker.length > 0) {
    return (
      <div className="sentiment-panel">
        <h4 className="sentiment-panel__title">News Sentiment Mix</h4>
        <p className="sentiment-panel__summary">
          All {byTicker.length} holdings scored <strong>neutral</strong> in the latest news scan.
        </p>
        <SentimentTickerList byTicker={byTicker} />
      </div>
    );
  }

  const displayLabels = labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1));

  return (
    <div className="sentiment-panel sentiment-panel--mixed">
      <h4 className="sentiment-panel__title">News Sentiment Mix</h4>
      <p className="sentiment-panel__summary">
        Latest news scan: <strong>{summaryParts.join(' · ')}</strong>
      </p>
      <Plot
        data={[{
          type: 'pie',
          labels: displayLabels,
          values: labels.map((l) => counts[l]),
          marker: { colors: labels.map((l) => SENTIMENT_COLORS[l]), line: { color: '#0f172a', width: 2 } },
          hole: 0.42,
          textinfo: 'label+percent',
          textposition: 'outside',
          textfont: { size: 12, color: '#e2e8f0' },
          hovertemplate: '%{label}: %{value} stocks (%{percent})<extra></extra>',
        }]}
        layout={{
          paper_bgcolor: PAPER_BG,
          plot_bgcolor: PAPER_BG,
          font: FONT,
          height: 240,
          margin: { l: 16, r: 16, t: 12, b: 12 },
          showlegend: false,
          uniformtext: { minsize: 11, mode: 'show' },
        }}
        config={PLOT_CONFIG}
        style={{ width: '100%' }}
        useResizeHandler
      />
      <SentimentTickerList byTicker={byTicker} />
    </div>
  );
}
