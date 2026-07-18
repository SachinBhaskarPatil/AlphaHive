import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Shield, Target, Brain, Sparkles,
  BarChart3, Activity, ChevronRight,
} from 'lucide-react';
import { ConfidenceMeter } from './AIExperience';
import { Button, Eyebrow, Heading, Text, Surface, Badge } from './ui/primitives';
import { StaggerItem, StaggerList } from './ui/motion';
import { formatInr, formatPct, displayTickerLabel } from '../utils/marketNormalize';

function deriveInsights(analysis) {
  const sc = analysis.forecast_scenarios;
  const season = analysis.seasonality || [];
  const baselineGrowth = sc?.baseline?.growth_pct ?? 0;
  const spread = sc ? (sc.aggressive?.growth_pct ?? 0) - (sc.conservative?.growth_pct ?? 0) : 0;
  const confMap = { High: 82, Medium: 58, Low: 34, Insufficient: 18 };
  const confidence = confMap[sc?.confidence] ?? 50;

  const winRate = season.length
    ? Math.round(season.reduce((sum, m) => sum + (m.win_rate ?? 0), 0) / season.length)
    : null;

  const opportunity = Math.min(96, Math.max(8, Math.round(
    40 + baselineGrowth * 1.2 + (winRate ?? 50) * 0.25 + (confidence - 50) * 0.3,
  )));
  const risk = Math.min(92, Math.max(10, Math.round(
    28 + Math.abs(spread) * 0.8 + (100 - (winRate ?? 50)) * 0.35 + (sc?.confidence === 'Low' ? 18 : 0),
  )));

  const ticker = displayTickerLabel(analysis.ticker);
  const strategy = sc?.active_name || analysis.winner_strategy || 'median';

  const bull = [
    baselineGrowth > 0 ? `Baseline 2026 path implies ${formatPct(baselineGrowth)} from current LTP.` : 'Historical seasonality supports selective entry windows.',
    winRate != null && winRate >= 55 ? `${winRate}% average monthly win rate across calendar months.` : 'Strategy backtest identified a repeatable edge.',
    sc?.active_description ? sc.active_description.slice(0, 160) : `${strategy} strategy selected as winner across validation years.`,
  ];

  const bear = [
    spread > 25 ? `Wide scenario spread (${spread.toFixed(0)}pp) signals elevated uncertainty.` : 'Macro shocks can invalidate historical patterns quickly.',
    sc?.confidence === 'Low' || sc?.confidence === 'Insufficient'
      ? 'Limited backtest history — treat forecasts as exploratory.'
      : 'Past seasonality does not guarantee future performance.',
    analysis.exclude_outliers
      ? 'Robust mode removes outliers — tails may be underrepresented.'
      : 'Volatility clusters can accelerate drawdowns beyond model bands.',
  ];

  const summary = `${ticker} at ${formatInr(analysis.ltp)} · ${analysis.history_days?.toLocaleString('en-IN')} trading days · `
    + `${strategy} · ${sc?.confidence || 'Medium'} confidence. `
    + (winRate != null
      ? `Seasonality shows ${winRate}% avg monthly win rate with 2026 scenario bands below.`
      : 'Agents synthesize seasonality with 2026 scenario bands below.');

  return { opportunity, risk, confidence, winRate, bull, bear, summary, strategy };
}

const TABS = [
  { id: 'summary', label: 'AI Summary', icon: Brain },
  { id: 'bull', label: 'Bull Case', icon: TrendingUp },
  { id: 'bear', label: 'Bear Case', icon: TrendingDown },
  { id: 'signals', label: 'Signals', icon: Activity },
];

export default function StockIntelligence({ analysis, displayName }) {
  const [tab, setTab] = useState('summary');
  const insight = useMemo(() => deriveInsights(analysis), [analysis]);
  const title = displayTickerLabel(displayName || analysis.ticker, displayName);
  const symbol = String(analysis.ticker || '').trim();

  return (
    <Surface glow className="stock-intel">
      <div className="stock-intel__hero">
        <div className="stock-intel__hero-copy">
          <Eyebrow>AI executive brief</Eyebrow>
          <Heading as="h2" size="lg">
            {title}
            <span className="stock-intel__symbol">{symbol}</span>
          </Heading>
          <Text muted className="stock-intel__summary">{insight.summary}</Text>
        </div>
        <div className="stock-intel__scores">
          <div className="stock-intel__score stock-intel__score--opp">
            <Target size={18} />
            <span className="stock-intel__score-label">Opportunity</span>
            <span className="stock-intel__score-value tabular">{insight.opportunity}</span>
          </div>
          <div className="stock-intel__score stock-intel__score--risk">
            <Shield size={18} />
            <span className="stock-intel__score-label">Risk</span>
            <span className="stock-intel__score-value tabular">{insight.risk}</span>
          </div>
          <div className="stock-intel__score stock-intel__score--conf">
            <Sparkles size={18} />
            <span className="stock-intel__score-label">Seasonal win</span>
            <span className="stock-intel__score-value tabular">
              {insight.winRate != null ? `${insight.winRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <ConfidenceMeter value={insight.confidence} label="Agent consensus confidence" />

      <div className="stock-intel__tabs" role="tablist">
        {TABS.map(({ id, label: tLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`stock-intel__tab${tab === id ? ' stock-intel__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} /> {tLabel}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
          className="stock-intel__panel"
        >
          {tab === 'summary' && (
            <StaggerList className="stock-intel__evidence">
              <StaggerItem>
                <div className="evidence-card">
                  <BarChart3 size={18} />
                  <div>
                    <p className="evidence-card__title">Active strategy</p>
                    <Text muted>{insight.strategy} · Lookback {analysis.lookback}</Text>
                  </div>
                  <Badge tone="violet">{analysis.forecast_scenarios?.confidence || 'Medium'}</Badge>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="evidence-card">
                  <Activity size={18} />
                  <div>
                    <p className="evidence-card__title">Price context</p>
                    <Text muted>
                      LTP {formatInr(analysis.ltp)} · {analysis.history_days?.toLocaleString('en-IN')} trading days
                    </Text>
                  </div>
                </div>
              </StaggerItem>
            </StaggerList>
          )}
          {(tab === 'bull' || tab === 'bear') && (
            <ul className="stock-intel__case-list">
              {(tab === 'bull' ? insight.bull : insight.bear).map((point) => (
                <li key={point} className={`stock-intel__case stock-intel__case--${tab}`}>
                  <ChevronRight size={14} /> {point}
                </li>
              ))}
            </ul>
          )}
          {tab === 'signals' && (
            <div className="stock-intel__signals">
              <div className="signal-pill signal-pill--up">
                <TrendingUp size={14} /> Expected {formatPct(analysis.forecast_scenarios?.baseline?.growth_pct ?? 0)}
              </div>
              <div className="signal-pill">
                <Brain size={14} /> Winner: {analysis.winner_strategy}
              </div>
              {analysis.exclude_outliers && (
                <div className="signal-pill signal-pill--warn">
                  <Shield size={14} /> Robust outlier mode
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="stock-intel__disclaimer">
        AI-generated research from historical patterns — not financial advice.
      </p>
    </Surface>
  );
}
