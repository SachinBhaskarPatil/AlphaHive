import { X, Shield, CheckCircle2 } from 'lucide-react';
import { GlassCard } from './Shared';
import { DataNotes, RebalanceTable } from './AnalyticsTables';
import {
  RiskBarChart, CorrelationHeatmapChart, RiskGaugeChart, SentimentPieChart,
} from './PortfolioVisualCharts';

const INTENT_COLOR = {
  ACCUMULATION: '#10b981',
  DISTRIBUTION: '#f43f5e',
  WARNING: '#f59e0b',
  NEUTRAL: '#94a3b8',
};

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 800, padding: '4px 10px', borderRadius: 999,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ReportBody({ text }) {
  if (!text) return null;
  const lines = String(text).split('\n');
  return (
    <div className="intel-report mr-scroll">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="intel-report__spacer" />;
        if (trimmed === '---') return <hr key={i} className="intel-report__rule" />;
        if (line.startsWith('# ')) {
          return <h4 key={i} className="intel-report__h1">{renderInline(line.slice(2))}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h5 key={i} className="intel-report__h2">{renderInline(line.slice(3))}</h5>;
        }
        if (line.startsWith('### ')) {
          return <p key={i} className="intel-report__h3">{renderInline(line.slice(4))}</p>;
        }
        if (line.startsWith('  - ')) {
          return <p key={i} className="intel-report__subbullet">{renderInline(line.slice(4))}</p>;
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="intel-report__bullet">{renderInline(line.slice(2))}</p>;
        }
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
          return <p key={i} className="intel-report__muted">{renderInline(trimmed)}</p>;
        }
        return <p key={i} className="intel-report__p">{renderInline(line)}</p>;
      })}
    </div>
  );
}

export default function PortfolioAnalysisPanel({
  data, portfolioName, onClose, isRefreshing = false, refreshStage = '',
}) {
  if (!data) return null;

  const intent = data.institutional_intent || 'NEUTRAL';
  const intentColor = INTENT_COLOR[intent] || INTENT_COLOR.NEUTRAL;
  const shadows = data.shadow_signals || [];
  const errors = data.errors || [];
  const visuals = data.visuals || {};
  const riskStocks = visuals.stock_risk_data || [];
  const corrMatrix = visuals.correlation_matrix || data.corrMatrix || {};
  const topRisk = [...riskStocks].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);
  const hasSentiment = (data.sentiment_data || []).length > 0;
  const tickerCount = Object.keys(corrMatrix).length;
  const wideHeatmap = tickerCount >= 7;
  const rebalanceWarnings = [
    ...(visuals.rebalance_safety?.warnings || []),
    ...(visuals.rebalance_growth?.warnings || []),
  ];

  return (
    <GlassCard className="portfolio-analysis-panel" style={{
      marginTop: '1rem', border: '1px solid rgba(59,130,246,0.25)',
      position: 'relative', opacity: isRefreshing ? 0.92 : 1,
    }}>
      {isRefreshing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem',
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6',
            animation: 'spin 0.9s linear infinite',
          }} />
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: '#93c5fd' }}>Refreshing analysis...</p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{refreshStage || 'Running agents and rebuilding charts'}</p>
          </div>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem',
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
      }}>
        <CheckCircle2 size={20} color="#10b981" />
        <div>
          <p style={{ fontSize: '0.88rem', fontWeight: 800, color: '#6ee7b7' }}>Analysis Complete</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{portfolioName || 'Portfolio'} · {data.tickers?.length || 0} stocks analyzed</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Visual Analytics</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        {data.regime && <Badge label={`Regime: ${data.regime}`} color="#22d3ee" />}
        <Badge label={`Intent: ${intent}`} color={intentColor} />
      </div>

      {shadows.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '12px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
          {shadows.map((s, i) => (
            <p key={i} style={{ fontSize: '0.8rem', color: '#c4b5fd', margin: '4px 0' }}>{s}</p>
          ))}
        </div>
      )}

      {/* Row 1 — Risk + Sentiment */}
      <div className={`portfolio-analytics-row${!hasSentiment ? ' portfolio-analytics-row--single' : ''}`}>
        {riskStocks.length > 0 && (
          <div className="mr-chart-wrap">
            <RiskBarChart stockRiskData={riskStocks} />
          </div>
        )}
        {hasSentiment && (
          <div className="mr-chart-wrap">
            <SentimentPieChart sentimentData={data.sentiment_data} />
          </div>
        )}
      </div>

      {/* Row 2 — Correlation + Gauges */}
      {tickerCount > 0 && (
        <div className={`portfolio-analytics-row--wide${wideHeatmap || !topRisk.length ? ' portfolio-analytics-row--single' : ''}`}>
          <div className="mr-chart-wrap">
            <CorrelationHeatmapChart matrix={corrMatrix} />
          </div>
          {topRisk.length > 0 && !wideHeatmap && (
            <div className="mr-chart-wrap">
              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: 8 }}>TOP RISK HOLDINGS</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 8 }}>
                {topRisk.map((s) => (
                  <RiskGaugeChart key={s.symbol} symbol={s.symbol} riskScore={s.risk_score} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {topRisk.length > 0 && wideHeatmap && (
        <div style={{ padding: '0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: 8 }}>TOP RISK HOLDINGS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, maxWidth: 520 }}>
            {topRisk.map((s) => (
              <RiskGaugeChart key={s.symbol} symbol={s.symbol} riskScore={s.risk_score} />
            ))}
          </div>
        </div>
      )}

      {/* Rebalancing */}
      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem' }}>Rebalancing Opportunities</h4>
      <DataNotes warnings={rebalanceWarnings} />
      <div className="portfolio-rebalance-grid">
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60a5fa', marginBottom: 10 }}>Risk Parity</p>
          {(visuals.rebalance_safety?.rows?.length > 0) ? (
            <RebalanceTable rows={visuals.rebalance_safety.rows} compact />
          ) : (
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Not enough price history to model risk-parity weights.</p>
          )}
        </div>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a78bfa', marginBottom: 10 }}>Growth Optimization</p>
          {(visuals.rebalance_growth?.rows?.length > 0) ? (
            <RebalanceTable rows={visuals.rebalance_growth.rows} compact />
          ) : (
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Not enough data for growth optimization.</p>
          )}
        </div>
      </div>

      {data.final_report && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
            Full Intelligence Report
          </summary>
          <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ReportBody text={data.final_report} />
          </div>
        </details>
      )}

      {errors.length > 0 && (
        <p style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: 12 }}>
          Note: Some data sources were unavailable (Yahoo Finance rate limits). Charts use available market data.
        </p>
      )}
    </GlassCard>
  );
}
