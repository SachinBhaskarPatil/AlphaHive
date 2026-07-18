import Plot from 'react-plotly.js';

const PLOT_CONFIG = { responsive: true, displayModeBar: false, displaylogo: false };

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RETURN_COLORSCALE = [
  [0, '#ef4444'],
  [0.25, '#f87171'],
  [0.5, '#fef9c3'],
  [0.75, '#86efac'],
  [1, '#16a34a'],
];

function heatmapColorBounds(values) {
  const flat = (values || []).flat().filter((v) => v != null && !Number.isNaN(v));
  if (!flat.length) return { zmin: -10, zmax: 10 };
  const absMax = Math.max(...flat.map((v) => Math.abs(v)), 3);
  const cap = Math.min(Math.ceil(absMax / 5) * 5, 40);
  return { zmin: -cap, zmax: cap };
}

function normalizeMonthColumns(columns = []) {
  const ordered = MONTH_ORDER.filter((m) => columns.includes(m));
  return ordered.length ? ordered : columns;
}

function trimMatrixForDisplay(matrix, maxYears) {
  if (!matrix?.values?.length) return matrix;
  const years = matrix.index || [];
  const currentYear = new Date().getFullYear();

  const hasData = (row) => row.some((v) => v != null && !Number.isNaN(v));

  const keepIndices = years
    .map((year, idx) => ({ year: Number(year), idx, values: matrix.values[idx] }))
    .filter(({ year, values }) => year <= currentYear && hasData(values));

  const limited = maxYears && keepIndices.length > maxYears
    ? keepIndices.slice(0, maxYears)
    : keepIndices;

  return {
    ...matrix,
    index: limited.map(({ year }) => year),
    values: limited.map(({ idx }) => matrix.values[idx]),
  };
}

function formatReturnLabel(v) {
  if (v == null || Number.isNaN(v)) return '';
  const n = Number(v);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function MonthlyReturnsHeatmap({ matrix, maxYears }) {
  const displayMatrix = trimMatrixForDisplay(matrix, maxYears);
  if (!displayMatrix?.values?.length) return null;
  const years = displayMatrix.index || [];
  const months = normalizeMonthColumns(displayMatrix.columns || []);
  const colIndex = months.map((m) => (displayMatrix.columns || []).indexOf(m));
  const values = years.map((_, ri) => colIndex.map((ci) => {
    const v = displayMatrix.values[ri]?.[ci];
    return v == null || Number.isNaN(v) ? null : Number(v);
  }));
  const { zmin, zmax } = heatmapColorBounds(values);
  const rowHeight = years.length > 20 ? 20 : years.length > 14 ? 24 : 28;
  const fontSize = years.length > 20 ? 7 : years.length > 14 ? 8 : 9;

  return (
    <Plot
      data={[{
        type: 'heatmap',
        x: months,
        y: years.map(String),
        z: values,
        zmin,
        zmax,
        zmid: 0,
        colorscale: RETURN_COLORSCALE,
        colorbar: {
          title: { text: 'Return %', font: { color: '#94a3b8', size: 10 } },
          tickfont: { color: '#94a3b8', size: 9 },
          thickness: 12,
          len: 0.7,
          x: 1.02,
          tickmode: 'array',
          tickvals: [zmin, Math.round(zmin / 2), 0, Math.round(zmax / 2), zmax],
          ticktext: [`${zmin}%`, `${Math.round(zmin / 2)}%`, '0%', `${Math.round(zmax / 2)}%`, `${zmax}%`],
        },
        text: values.map((row) => row.map(formatReturnLabel)),
        texttemplate: '%{text}',
        textfont: {
          size: fontSize,
          color: '#0f172a',
          family: 'JetBrains Mono, monospace',
        },
        hoverongaps: false,
        hovertemplate: '%{customdata}<extra></extra>',
        customdata: values.map((row, ri) => row.map((v, ci) => (
          v != null
            ? `Year ${years[ri]} · ${months[ci]}<br>Return: ${v.toFixed(2)}%`
            : `Year ${years[ri]} · ${months[ci]}<br>No data`
        ))),
      }]}
      layout={{
        title: { text: 'Monthly returns heatmap', font: { color: '#e2e8f0', size: 14 }, x: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#1e293b',
        font: { color: '#94a3b8' },
        height: Math.min(640, Math.max(360, years.length * rowHeight + 110)),
        margin: { l: 48, r: 64, t: 44, b: 48 },
        xaxis: {
          type: 'category',
          categoryorder: 'array',
          categoryarray: months,
          tickmode: 'array',
          tickvals: months,
          ticktext: months,
          tickfont: { color: '#cbd5e1', size: 11 },
          side: 'bottom',
          showgrid: false,
        },
        yaxis: {
          type: 'category',
          autorange: 'reversed',
          tickfont: { color: '#cbd5e1', size: years.length > 16 ? 9 : 10 },
          showgrid: false,
        },
      }}
      config={PLOT_CONFIG}
      style={{ width: '100%', minHeight: 280 }}
      className="plotly-chart plotly-chart--heatmap"
      useResizeHandler
    />
  );
}

export function SeasonalityChart({ seasonality = [] }) {
  if (!seasonality.length) return null;
  const sorted = [...seasonality].sort((a, b) => (a.month || 0) - (b.month || 0));
  const months = sorted.map((s) => s.month_name || `M${s.month}`);
  const avg = sorted.map((s) => s.avg_return);
  const win = sorted.map((s) => s.win_rate);
  const barColors = avg.map((v) => (v >= 0 ? '#10b981' : '#f43f5e'));

  return (
    <Plot
      data={[
        {
          type: 'bar',
          x: months,
          y: avg,
          name: 'Avg Return %',
          marker: { color: barColors, opacity: 0.85 },
          yaxis: 'y',
          hovertemplate: '%{x}<br>Avg return: %{y:.2f}%<extra></extra>',
        },
        {
          type: 'scatter',
          mode: 'lines+markers+text',
          x: months,
          y: win,
          name: 'Win Rate %',
          line: { color: '#fbbf24', width: 3 },
          marker: { size: 8, color: '#fbbf24' },
          text: win.map((v) => `${Math.round(v)}%`),
          textposition: 'top center',
          textfont: { size: 9, color: '#fbbf24' },
          yaxis: 'y2',
          hovertemplate: '%{x}<br>Win rate: %{y:.1f}%<extra></extra>',
        },
      ]}
      layout={{
        title: { text: 'Seasonality profile', font: { color: '#e2e8f0', size: 14 }, x: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(15,23,42,0.35)',
        height: 360,
        margin: { l: 52, r: 56, t: 44, b: 48 },
        legend: { orientation: 'h', y: 1.14, font: { color: '#94a3b8', size: 10 } },
        xaxis: {
          type: 'category',
          tickfont: { color: '#cbd5e1', size: 10 },
        },
        yaxis: {
          title: { text: 'Avg Return %', font: { size: 10, color: '#94a3b8' } },
          tickfont: { color: '#94a3b8' },
          gridcolor: 'rgba(255,255,255,0.06)',
        },
        yaxis2: {
          title: { text: 'Win Rate %', font: { size: 10, color: '#fbbf24' } },
          tickfont: { color: '#fbbf24' },
          overlaying: 'y',
          side: 'right',
          range: [0, 115],
          showgrid: false,
        },
        font: { color: '#94a3b8' },
      }}
      config={PLOT_CONFIG}
      style={{ width: '100%' }}
      className="plotly-chart"
      useResizeHandler
    />
  );
}

export function Forecast2026Chart({ ticker, scenarios }) {
  if (!scenarios?.range_dates?.length) return null;
  const dates = scenarios.range_dates;
  const traces = [
    {
      type: 'scatter',
      x: dates,
      y: scenarios.conservative_path,
      mode: 'lines',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
    },
    {
      type: 'scatter',
      x: dates,
      y: scenarios.aggressive_path,
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(148,163,184,0.14)',
      line: { width: 0 },
      name: 'Scenario range',
      hoverinfo: 'skip',
    },
    {
      type: 'scatter',
      x: dates,
      y: scenarios.baseline_path,
      mode: 'lines',
      name: 'Expected (baseline)',
      line: { color: '#3b82f6', width: 2.5 },
      hovertemplate: 'Expected: ₹%{y:,.0f}<extra></extra>',
    },
    {
      type: 'scatter',
      x: dates,
      y: scenarios.conservative_path,
      mode: 'lines',
      name: 'Conservative',
      line: { color: '#10b981', width: 1.5, dash: 'dot' },
      hovertemplate: 'Conservative: ₹%{y:,.0f}<extra></extra>',
    },
    {
      type: 'scatter',
      x: dates,
      y: scenarios.aggressive_path,
      mode: 'lines',
      name: 'Aggressive',
      line: { color: '#f59e0b', width: 1.5, dash: 'dot' },
      hovertemplate: 'Aggressive: ₹%{y:,.0f}<extra></extra>',
    },
  ];

  if (scenarios.active_path?.length) {
    traces.push({
      type: 'scatter',
      x: scenarios.active_path.map((p) => p.date),
      y: scenarios.active_path.map((p) => p.price),
      mode: 'lines',
      name: `Active: ${scenarios.active_name}`,
      line: { color: '#a78bfa', width: 3 },
      hovertemplate: `${scenarios.active_name}: ₹%{y:,.0f}<extra></extra>`,
    });
  }
  if (scenarios.alt_path?.length) {
    traces.push({
      type: 'scatter',
      x: scenarios.alt_path.map((p) => p.date),
      y: scenarios.alt_path.map((p) => p.price),
      mode: 'lines',
      name: `Alt: ${scenarios.alt_name}`,
      line: { color: '#64748b', width: 2, dash: 'dash' },
      hovertemplate: `${scenarios.alt_name}: ₹%{y:,.0f}<extra></extra>`,
    });
  }

  const short = String(ticker || '').replace(/\.(NS|BO)$/i, '').replace(/^\^/, '');

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: `${short} · Dec 2026 forecast`, font: { color: '#e2e8f0', size: 14 }, x: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(15,23,42,0.35)',
        height: 400,
        margin: { l: 68, r: 16, t: 56, b: 56 },
        hovermode: 'x unified',
        legend: {
          orientation: 'h',
          y: 1.18,
          x: 0,
          font: { color: '#94a3b8', size: 9 },
        },
        xaxis: {
          type: 'date',
          tickfont: { color: '#94a3b8', size: 10 },
          tickformat: '%b %Y',
        },
        yaxis: {
          tickfont: { color: '#94a3b8' },
          gridcolor: 'rgba(255,255,255,0.06)',
          title: { text: 'Price (₹)', font: { size: 10, color: '#94a3b8' } },
          tickformat: ',.0f',
        },
        font: { color: '#94a3b8' },
      }}
      config={PLOT_CONFIG}
      style={{ width: '100%' }}
      className="plotly-chart plotly-chart--forecast"
      useResizeHandler
    />
  );
}
