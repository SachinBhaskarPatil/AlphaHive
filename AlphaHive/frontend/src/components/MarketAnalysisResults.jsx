import { Download, Save } from 'lucide-react';
import { GlassCard } from './Shared';
import StockIntelligence from './StockIntelligence';
import { MonthlyReturnsHeatmap, SeasonalityChart, Forecast2026Chart } from './MarketAnalysisCharts';
import { marketApi } from '../api';
import { Button } from './ui/primitives';
import { useCommandModal } from '../context/CommandModalContext';
import { StaggerItem, StaggerList } from './ui/motion';
import { formatInr, formatPct } from '../utils/marketNormalize';

const SCENARIO_LABELS = {
  conservative: 'Conservative',
  baseline: 'Expected',
  aggressive: 'Aggressive',
};

const HEATMAP_COMPACT_YEARS = 18;

function hasMissingCells(matrix) {
  return (matrix?.values || []).some((row) => row.some((v) => v == null || Number.isNaN(v)));
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MarketAnalysisResults({
  analysis, handle, displayName, onSaveForecast,
}) {
  const { showAlert } = useCommandModal();
  if (!analysis) return null;

  const scenarios = analysis.forecast_scenarios;
  const ticker = analysis.ticker;

  const downloadMatrix = () => {
    const m = analysis.returns_matrix;
    if (!m?.values) return;
    const header = ['Year', ...m.columns];
    const rows = [header, ...m.index.map((y, i) => [y, ...m.values[i]])];
    downloadCsv(`${ticker}_monthly_returns.csv`, rows);
  };

  const downloadForecast = () => {
    if (!scenarios?.range_dates) return;
    const rows = [['Date', 'Conservative (Low)', 'Baseline (Target)', 'Aggressive (High)']];
    scenarios.range_dates.forEach((d, i) => {
      rows.push([
        d,
        scenarios.conservative_path[i],
        scenarios.baseline_path[i],
        scenarios.aggressive_path[i],
      ]);
    });
    downloadCsv(`${ticker}_forecast_2026.csv`, rows);
  };

  const saveForecast = async () => {
    if (!scenarios || !onSaveForecast) return;
    try {
      await onSaveForecast({
        user_handle: handle,
        ticker,
        current_price: analysis.ltp,
        target_price: scenarios.baseline.price,
        target_date: '2026-12-31',
        strategy: scenarios.active_name,
        confidence: scenarios.confidence,
        years_tested: (scenarios.years_tested || []).length || 3,
      });
      await showAlert(
        `${ticker.replace(/\.(NS|BO)$/i, '')} forecast saved to Forecast Tracker.`,
        { variant: 'success', title: 'Forecast saved', confirmLabel: 'Got it' },
      );
    } catch {
      await showAlert('Could not save forecast. Try again when the backend is available.', {
        variant: 'error',
        title: 'Save failed',
      });
    }
  };

  const yearCount = analysis.returns_matrix?.index?.length || 0;
  const wideHeatmap = yearCount > HEATMAP_COMPACT_YEARS;
  const heatmapNote = wideHeatmap
    ? `Showing the most recent ${HEATMAP_COMPACT_YEARS} of ${yearCount} years. Download CSV for the full matrix.`
    : null;

  return (
    <div className="stock-results">
      <StockIntelligence analysis={analysis} displayName={displayName} />

      {(analysis.returns_matrix || analysis.seasonality?.length > 0) && (
        <div className="stock-results__section-head">
          <h3 className="stock-results__section-title">Historical patterns</h3>
          <p className="stock-results__section-sub">
            Monthly return heatmap and seasonality profile for {analysis.lookback}
          </p>
        </div>
      )}

      <StaggerList className={`stock-results__charts${wideHeatmap ? ' stock-results__charts--stacked' : ''}`}>
        {analysis.returns_matrix && (
          <StaggerItem>
            <GlassCard className="stock-results__chart-card">
              <div className={`stock-results__heatmap-wrap${wideHeatmap ? ' stock-results__heatmap-wrap--scroll' : ''}`}>
                <MonthlyReturnsHeatmap
                  matrix={analysis.returns_matrix}
                  maxYears={wideHeatmap ? HEATMAP_COMPACT_YEARS : undefined}
                />
              </div>
              {heatmapNote && <p className="stock-results__note">{heatmapNote}</p>}
              {(hasMissingCells(analysis.returns_matrix) || analysis.exclude_outliers) && (
                <p className="stock-results__note">
                  Gray cells = no data{analysis.exclude_outliers ? ' or outlier removed (Robust)' : ''}.
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={downloadMatrix} className="stock-results__download-btn">
                <Download size={14} /> Download matrix
              </Button>
            </GlassCard>
          </StaggerItem>
        )}
        {analysis.seasonality?.length > 0 && (
          <StaggerItem>
            <GlassCard className="stock-results__chart-card">
              <SeasonalityChart seasonality={analysis.seasonality} />
              <p className="stock-results__note">Bars = avg monthly return · Gold line = historical win rate by month</p>
            </GlassCard>
          </StaggerItem>
        )}
      </StaggerList>

      {scenarios && (
        <GlassCard className="stock-forecast-panel">
          <div className="stock-forecast-panel__head">
            <h3 className="stock-forecast-panel__title">2026 forecast scenarios</h3>
            <p className="stock-forecast-panel__subtitle">
              Projected to Dec 2026 · ±{scenarios.accuracy_pct}% historical model error
            </p>
          </div>
          <div className="stock-forecast-panel__scenarios">
            <div className="scenario-card scenario-card--strategy">
              <p className="scenario-card__label">Active strategy</p>
              <p className="scenario-card__value">{scenarios.active_name}</p>
              <p className="scenario-card__sub">Backtest accuracy ±{scenarios.accuracy_pct}%</p>
            </div>
            {['conservative', 'baseline', 'aggressive'].map((key) => {
              const s = scenarios[key];
              const accent = key === 'baseline';
              return (
                <div key={key} className={`scenario-card${accent ? ' scenario-card--baseline' : ''}`}>
                  <p className="scenario-card__label">{SCENARIO_LABELS[key]}</p>
                  <p className="scenario-card__value tabular">{formatInr(s.price)}</p>
                  <p className={`scenario-card__sub tabular${s.growth_pct >= 0 ? ' scenario-card__sub--up' : ' scenario-card__sub--down'}`}>
                    {formatPct(s.growth_pct)}
                  </p>
                </div>
              );
            })}
          </div>

          <details open className="stock-forecast-panel__details">
            <summary>Strategy reasoning</summary>
            <p>{scenarios.active_description}</p>
            {scenarios.years_tested?.length > 0 && (
              <p className="stock-results__note">
                Validation: {scenarios.years_tested.join(', ')} · Confidence: {scenarios.confidence}
              </p>
            )}
          </details>

          <Forecast2026Chart ticker={ticker} scenarios={scenarios} />

          <div className="stock-forecast-panel__actions">
            <Button variant="ghost" size="sm" onClick={downloadForecast}><Download size={14} /> CSV</Button>
            <Button size="sm" onClick={saveForecast}><Save size={14} /> Save to tracker</Button>
            <a className="ah-btn ah-btn--ghost ah-btn--sm" href={marketApi.pdfUrl(ticker)} target="_blank" rel="noreferrer">
              <Download size={14} /> PDF report
            </a>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
