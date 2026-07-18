import { useRef, useEffect, useState } from 'react';
import { Activity, CheckCircle, Database, BarChart2, LineChart } from 'lucide-react';
import { GlassCard, SectionHeader, HiveLoader, ThinkingDots } from '../components/Shared';
import { SegmentedControl, TerminalPanel, PageShell } from '../components/AIExperience';
import { ReportBody } from '../components/PortfolioAnalysisPanel';
import TickerAutocomplete from '../components/TickerAutocomplete';
import MarketAnalysisResults from '../components/MarketAnalysisResults';
import { useCommandModal } from '../context/CommandModalContext';
import { analyzeApi, marketApi, forecastApi } from '../api';
import { pollAnalyzeTask } from '../utils/pollAnalyze';
import { saveShadowHistory } from '../utils/shadowHistory';

const BRAND_CATEGORIES = ['Nifty 50', 'Nifty Next 50', 'Midcap'];

const LOOKBACK_OPTIONS = ['1y', '3y', '5y', '5y+ (Max)'];

const BENCHMARK_INDICES = {
  'Nifty 50': '^NSEI',
  Sensex: '^BSESN',
  'Nifty Next 50': 'JUNIORBEES.NS',
  'Nifty Midcap 100': '^CRSLDX',
};

function normalizeTicker(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s.startsWith('^') || s.includes('.')) return s;
  return `${s}.NS`;
}

function parseSingleTickerInput(raw) {
  const parts = String(raw || '').split(',').map((t) => t.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function normalizeTickerList(raw) {
  return raw
    .split(/[,\n]+/)
    .map((t) => normalizeTicker(t))
    .filter(Boolean);
}

function buildBatchFindings(result) {
  const items = [];
  (result.sentiment_data || []).forEach((s) => {
    items.push({
      type: 'SENTIMENT',
      ticker: s.ticker,
      label: `${(s.ticker || '').replace(/\.(NS|BO)$/i, '')}: ${s.sentiment || 'neutral'}`,
      detail: s.summary || '',
    });
  });
  (result.technical_data || []).forEach((t) => {
    items.push({
      type: 'TECH',
      ticker: t.ticker,
      label: `${(t.ticker || '').replace(/\.(NS|BO)$/i, '')}: ${t.concordance || 'Technical scan'}`,
      detail: typeof t.patterns === 'string' ? t.patterns.slice(0, 120) : '',
    });
  });
  (result.dividend_data || []).forEach((d) => {
    items.push({
      type: 'DIVIDEND',
      ticker: d.ticker,
      label: `${(d.ticker || '').replace(/\.(NS|BO)$/i, '')}: dividend signal`,
      detail: d.yield != null ? `Yield ${d.yield}%` : (d.status || ''),
    });
  });
  (result.sector_data || []).forEach((s) => {
    items.push({
      type: 'SECTOR',
      label: s.sector || s.name || 'Sector',
      detail: s.sentiment || s.trend || JSON.stringify(s).slice(0, 80),
    });
  });
  (result.shadow_signals || []).forEach((msg) => {
    items.push({ type: 'SHADOW', label: 'Shadow signal', detail: msg });
  });
  (result.celebrations || []).forEach((c) => {
    items.push({ type: 'CELEBRATION', label: c.type || 'Alert', detail: c.message || '' });
  });
  return items;
}

const SIGNAL_COLOR = {
  SHADOW: '#f43f5e',
  SENTIMENT: '#06b6d4',
  TECH: '#8b5cf6',
  DIVIDEND: '#10b981',
  SECTOR: '#f59e0b',
  CELEBRATION: '#22d3ee',
};

export default function DashboardTab({ handle }) {
  const { showAlert } = useCommandModal();
  const [tickers, setTickers] = useState('TCS, RELIANCE, INFY');
  const [singleTicker, setSingleTicker] = useState('TCS');
  const [lookback, setLookback] = useState('5y+ (Max)');
  const [robust, setRobust] = useState(false);
  const [hubMode, setHubMode] = useState('stock'); // stock | benchmark
  const [selectedBenchmark, setSelectedBenchmark] = useState('Nifty 50');
  const [analysisLabel, setAnalysisLabel] = useState('');
  const [batchActive, setBatchActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusLine, setStatusLine] = useState('> READY FOR MARKET INGESTION.');
  const [report, setReport] = useState('');
  const [findings, setFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [brandMetaMap, setBrandMetaMap] = useState({});
  const [batchSectionOpen, setBatchSectionOpen] = useState(false);
  const batchAbortRef = useRef(null);
  const urlTickerHandled = useRef(false);

  const showBatchPanel = batchActive || findings.length > 0 || !!report;

  useEffect(() => () => {
    batchAbortRef.current?.abort();
  }, []);

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

  const runMarketAnalysis = async (tickerRaw, label) => {
    const ticker = normalizeTicker(tickerRaw);
    if (!ticker) {
      showAlert('Enter a valid symbol.', { variant: 'warning', title: 'Invalid ticker' });
      return;
    }
    if (isAnalyzing) return;

    setBatchActive(false);
    setIsAnalyzing(true);
    setAnalysisLabel(label || ticker);
    setStatusLine(`> Fetching market history for ${ticker}...`);
    setAnalysis(null);
    setFindings([]);
    setReport('');

    try {
      const { data } = await marketApi.analysis(ticker, {
        lookback,
        exclude_outliers: robust,
      });
      setAnalysis(data);
      const sc = data.forecast_scenarios;
      setStatusLine(
        `> ${data.ticker} @ ₹${data.ltp?.toFixed(2)}\n`
        + `> Lookback: ${data.lookback} · ${data.history_days || '—'} trading days\n`
        + `> Strategy: ${sc?.active_name || data.winner_strategy}\n`
        + `> 2026 baseline: ₹${sc?.baseline?.price ?? data.forecast?.target_price ?? 'N/A'}`,
      );
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Analysis failed.';
      setStatusLine(`> ERROR: ${msg}`);
      showAlert(msg, { variant: 'error', title: 'Analysis failed' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runSingle = () => {
    const ticker = parseSingleTickerInput(singleTicker);
    runMarketAnalysis(ticker, ticker);
  };

  const runBenchmark = (indexName) => {
    setSelectedBenchmark(indexName);
    const sym = BENCHMARK_INDICES[indexName];
    runMarketAnalysis(sym, `${indexName} (${sym})`);
  };

  const switchHubMode = (mode) => {
    if (mode === hubMode) return;
    setHubMode(mode);
    // Don't keep the other mode's results on screen after a toggle switch
    setAnalysis(null);
    setAnalysisLabel('');
    setBatchActive(false);
    setFindings([]);
    setReport('');
    setStatusLine('> READY FOR MARKET INGESTION.');
  };

  useEffect(() => {
    if (urlTickerHandled.current) return;
    const raw = new URLSearchParams(window.location.search).get('ticker')?.trim();
    if (!raw) return;
    urlTickerHandled.current = true;
    const sym = parseSingleTickerInput(raw) || raw;
    const display = sym.replace(/\.(NS|BO)$/i, '');
    setSingleTicker(display);
    setHubMode('stock');
    runMarketAnalysis(sym, display);
    // Deep-link auto-analyze runs once on mount with URL ticker param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runBatch = async () => {
    const list = normalizeTickerList(tickers);
    if (list.length < 1) {
      showAlert('Enter at least one ticker for batch intelligence.', { variant: 'warning', title: 'No tickers' });
      return;
    }
    if (isAnalyzing) return;

    setBatchActive(true);
    setBatchSectionOpen(true);
    setIsAnalyzing(true);
    setAnalysis(null);
    setStatusLine(`> Orchestrating LangGraph analysis for ${list.length} tickers...`);
    setFindings([]);
    setReport('');

    batchAbortRef.current = new AbortController();
    try {
      const { data } = await analyzeApi.run(list, handle);
      const taskId = data.task_id;

      const result = await pollAnalyzeTask(taskId, {
        signal: batchAbortRef.current.signal,
        onPoll: (polls) => setStatusLine(`> Agent mesh running... (${polls * 2}s elapsed)`),
      });
      setReport(result.final_report || '');
      setFindings(buildBatchFindings(result));
      saveShadowHistory(handle, list, result);
      setStatusLine(
        `> Batch complete · ${list.length} tickers\n`
        + `> Intent: ${result.institutional_intent || 'NEUTRAL'}\n`
        + `> Regime: ${result.regime || 'N/A'}`,
      );
    } catch (e) {
      if (e.name === 'AbortError') return; // component unmounted mid-poll
      const msg = e.message || 'Batch analysis failed to start.';
      setStatusLine(`> ERROR: ${msg}`);
      showAlert(msg, { variant: 'error', title: 'Batch failed' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PageShell className="market-analysis-hub">
      <SectionHeader
        eyebrow="Market Intelligence"
        icon={<Activity size={20} color="var(--accent-blue)" />}
        title="Market Analysis Hub"
        sub="Deep-dive into historical patterns and AI-powered predictions for stocks or indices — your swarm reads the tape so you don't have to."
      />

      <GlassCard className="market-hub__panel">
        <div className="market-hub__panel-head">
          <SegmentedControl
            value={hubMode}
            onChange={switchHubMode}
            options={[
              { id: 'stock', label: 'Stock Analysis', icon: BarChart2 },
              { id: 'benchmark', label: 'Benchmark / Index', icon: LineChart },
            ]}
          />
          <div className="market-hub__settings">
            <span className="market-hub__settings-label">Lookback</span>
            <div className="market-hub__lookbacks" role="tablist" aria-label="Lookback period">
              {LOOKBACK_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="tab"
                  aria-selected={lookback === o}
                  className={`market-hub__lookback${lookback === o ? ' market-hub__lookback--active' : ''}`}
                  onClick={() => setLookback(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <label className={`market-hub__robust${robust ? ' market-hub__robust--active' : ''}`}>
              <input type="checkbox" checked={robust} onChange={(e) => setRobust(e.target.checked)} />
              <span>Robust</span>
            </label>
          </div>
        </div>

        {hubMode === 'stock' ? (
          <>
            <p className="market-hub__section-label">Single stock</p>
            <div className="market-hub__command-bar">
              <TickerAutocomplete
                value={singleTicker}
                onChange={setSingleTicker}
                brands={brandMetaMap}
                allowMultiple={false}
                onEnter={runSingle}
                placeholder="Search ticker — TCS, INFY, RELIANCE..."
              />
              <button
                type="button"
                className="market-hub__analyze-btn btn-primary"
                onClick={runSingle}
                disabled={isAnalyzing}
              >
                {isAnalyzing && !batchActive ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="market-hub__section-label">Index benchmark</p>
            <p className="market-hub__benchmark-sub">Select an index to run the full analysis pipeline</p>
            <div className="market-hub__benchmark-grid">
              {Object.keys(BENCHMARK_INDICES).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`market-hub__benchmark-chip${selectedBenchmark === name ? ' market-hub__benchmark-chip--active' : ''}`}
                  onClick={() => runBenchmark(name)}
                  disabled={isAnalyzing}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        <details
          className="market-hub__batch-inline"
          open={batchSectionOpen}
          onToggle={(e) => setBatchSectionOpen(e.currentTarget.open)}
        >
          <summary className="market-hub__batch-summary">
            Multi-ticker AI Intelligence (LangGraph)
          </summary>
          <p className="market-hub__batch-hint">Run agent mesh across multiple symbols at once</p>
          <div className="market-hub__command-bar market-hub__command-bar--batch">
            <TickerAutocomplete
              value={tickers}
              onChange={setTickers}
              brands={brandMetaMap}
              allowMultiple
              onEnter={runBatch}
              placeholder="TCS, INFY, RELIANCE..."
            />
            <button
              type="button"
              className="market-hub__analyze-btn market-hub__analyze-btn--batch btn-primary"
              onClick={runBatch}
              disabled={isAnalyzing}
            >
              {isAnalyzing && batchActive ? 'Running...' : 'Run'}
            </button>
          </div>
        </details>
      </GlassCard>

      {isAnalyzing && !batchActive && (
        <GlassCard className="market-hub__loading glow-ring">
          <div className="market-hub__loading-inner">
            <HiveLoader size={34} />
            <div>
              <p className="market-hub__loading-title">
                Analyzing {hubMode === 'benchmark' ? selectedBenchmark : singleTicker} <ThinkingDots />
              </p>
              <p className="market-hub__loading-sub">
                Parsing price history, seasonality, and forecast scenarios…
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {analysis && !batchActive && (
        <MarketAnalysisResults
          analysis={analysis}
          handle={handle}
          displayName={analysisLabel}
          onSaveForecast={(body) => forecastApi.save(body)}
        />
      )}

      {showBatchPanel && (
      <div className="market-hub__batch-results mr-grid-auto">
        <GlassCard className="market-hub__terminal-card">
          <TerminalPanel lines={statusLine} glow={isAnalyzing && batchActive} />
          {report && batchActive && (
            <details className="market-hub__report-details">
              <summary>Full intelligence report</summary>
              <div className="market-hub__report-body">
                <ReportBody text={report} />
              </div>
            </details>
          )}
        </GlassCard>

        <GlassCard className="market-hub__signals-card">
          <h3 className="market-hub__signals-title">
            <CheckCircle size={18} color="#10b981" /> Live Signals
          </h3>
          <div className="market-hub__signals-list">
            {findings.length ? findings.slice(0, 20).map((f, i) => (
              <div
                key={`${f.type}-${i}`}
                className="market-hub__signal"
                style={{ borderLeftColor: SIGNAL_COLOR[f.type] || '#06b6d4' }}
              >
                <p className="market-hub__signal-label">{f.label}</p>
                {f.detail && <p className="market-hub__signal-detail">{f.detail}</p>}
              </div>
            )) : (
              <div className="market-hub__signals-empty">
                <Database size={32} />
                <p>{batchActive && isAnalyzing ? 'Collecting agent signals...' : 'Expand AI Intelligence above to run LangGraph batch analysis.'}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
      )}
    </PageShell>
  );
}
