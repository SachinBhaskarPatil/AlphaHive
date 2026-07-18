import Plot from 'react-plotly.js';

export default function SimulationChart({ series }) {
  if (!series?.portfolio?.length) return null;

  const traces = [
    {
      x: series.dates,
      y: series.portfolio,
      type: 'scatter',
      mode: 'lines',
      name: 'Smart Portfolio',
      line: { color: '#10b981', width: 2.5 },
      hovertemplate: '<b>%{x|%b %d, %Y}</b><br>Smart Portfolio: %{y:.3f}<extra></extra>',
    },
    {
      x: series.dates,
      y: series.benchmark,
      type: 'scatter',
      mode: 'lines',
      name: 'Nifty 50',
      line: { color: '#94a3b8', width: 2, dash: 'dot' },
      hovertemplate: '<b>%{x|%b %d, %Y}</b><br>Nifty 50: %{y:.3f}<extra></extra>',
    },
  ];

  const layout = {
    title: {
      text: 'Historical Performance Simulation (1 Year)',
      font: { color: '#cbd5e1', size: 14 },
      x: 0,
      xanchor: 'left',
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(15,23,42,0.35)',
    font: { color: '#94a3b8', family: 'Inter, sans-serif' },
    xaxis: {
      type: 'date',
      gridcolor: 'rgba(255,255,255,0.08)',
      zeroline: false,
      tickfont: { size: 11, color: '#64748b' },
      rangeslider: { visible: false },
    },
    yaxis: {
      title: { text: 'Growth (1 = Base)', font: { size: 11, color: '#64748b' } },
      gridcolor: 'rgba(255,255,255,0.08)',
      zeroline: false,
      tickfont: { size: 11, color: '#64748b' },
    },
    height: 420,
    margin: { l: 56, r: 24, t: 48, b: 48 },
    legend: {
      orientation: 'h',
      y: -0.18,
      x: 0,
      font: { size: 12, color: '#94a3b8' },
      bgcolor: 'rgba(0,0,0,0)',
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: '#0f172a',
      bordercolor: 'rgba(6,182,212,0.35)',
      font: { color: '#f8fafc', size: 12 },
    },
    dragmode: 'zoom',
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'portfolio_simulation',
      height: 420,
      width: 900,
    },
  };

  return (
    <div style={{ width: '100%', minHeight: 420 }}>
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
      <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: 8 }}>
        Drag to zoom · Double-click to reset · Hover for values
      </p>
    </div>
  );
}
