import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Download, BarChart2, Search, Check, Plus, FolderOpen,
  FileText, X, TrendingUp, Shield, Layers, PieChart, ExternalLink,
} from 'lucide-react';
import { GlassCard, SectionHeader } from '../components/Shared';
import { SegmentedControl, PageShell } from '../components/AIExperience';
import { PageHeader } from '../components/ui/primitives';
import { CorrelationMatrixTable, DataNotes, RebalanceTable } from '../components/AnalyticsTables';
import TickerAutocomplete from '../components/TickerAutocomplete';
import PortfolioAnalysisPanel from '../components/PortfolioAnalysisPanel';
import { useLoader } from '../context/LoaderContext';
import { useCommandModal } from '../context/CommandModalContext';
import { portfolioApi, profileApi, marketApi, analyzeApi, reportsApi } from '../api';
import { pollAnalyzeTask } from '../utils/pollAnalyze';
import { saveShadowHistory } from '../utils/shadowHistory';

const CATEGORIES = ['Nifty 50', 'Nifty Next 50', 'Midcap'];
const PAGE_TABS = [
  { id: 'build', label: 'Build', icon: Layers },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

function shortFilename(name) {
  if (!name || name.length <= 36) return name;
  return `${name.slice(0, 18)}…${name.slice(-14)}`;
}

function draftKey(handle) {
  return `mr_portfolio_draft_${handle}`;
}

function parseTickerInput(raw) {
  return raw
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clipLabel(text, max = 28) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function resolveAnalyzeTargets({ draftMode, holdings, selected }) {
  const selectedList = [...selected];
  const holdingsSymbols = holdings.map((h) => h.Symbol);
  const holdingsSet = new Set(holdingsSymbols);
  const selectionChanged = selectedList.length > 0 && (
    selectedList.length !== holdingsSymbols.length
    || selectedList.some((s) => !holdingsSet.has(s))
  );

  if (draftMode || !holdings.length || selectionChanged) {
    return {
      tickers: selectedList,
      holdingRows: selectedList.map((sym) => {
        const existing = holdings.find((h) => h.Symbol === sym);
        return existing || { Symbol: sym, Quantity: 10, 'Average Price': 0 };
      }),
    };
  }

  return { tickers: holdingsSymbols, holdingRows: holdings };
}

function groupReports(files) {
  const groups = new Map();
  for (const r of files) {
    const base = r.filename.replace(/\.(html|txt|pdf)$/i, '');
    const entry = groups.get(base) || { base, modified: r.modified, modified_ts: r.modified_ts || 0, files: [] };
    entry.files.push(r);
    if ((r.modified_ts || 0) >= entry.modified_ts) {
      entry.modified = r.modified;
      entry.modified_ts = r.modified_ts || 0;
    }
    groups.set(base, entry);
  }
  return [...groups.values()].sort((a, b) => (b.modified_ts || 0) - (a.modified_ts || 0));
}

const ANALYSIS_STAGES = [
  'Starting portfolio analysis...',
  'Mapping market regimes...',
  'Analyzing sentiment...',
  'Running technical scan...',
  'Detecting shadow activity...',
  'Synthesizing intelligence report...',
];

export default function PortfolioTab({ handle, persona }) {
  const { showLoader, updateLoader, hideLoader } = useLoader();
  const { showAlert, showConfirm } = useCommandModal();
  const [pageTab, setPageTab] = useState('build');
  const [names, setNames] = useState([]);
  const [activeName, setActiveName] = useState('');
  const [holdings, setHoldings] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [category, setCategory] = useState('Nifty 50');
  const [brandSearch, setBrandSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [corrTickers, setCorrTickers] = useState('');
  const [corrMatrix, setCorrMatrix] = useState(null);
  const [rebalResult, setRebalResult] = useState(null);
  const [rebalSource, setRebalSource] = useState('');
  const [rebalMode, setRebalMode] = useState('safety');
  const [corrLoading, setCorrLoading] = useState(false);
  const [rebalLoading, setRebalLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStage, setAnalysisStage] = useState('');
  const analysisRef = useRef(null);
  const analyzeAbortRef = useRef(null);
  const [brandMetaMap, setBrandMetaMap] = useState({});
  const [loadSource, setLoadSource] = useState('none'); // none | profile | smart | saved | draft
  const [draftMode, setDraftMode] = useState(() => sessionStorage.getItem(draftKey(handle)) === '1');
  const [draftName, setDraftName] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const rep = await reportsApi.list(handle);
      setReports(rep.data.reports || []);
    } catch {
      /* keep existing list */
    } finally {
      setReportsLoading(false);
    }
  }, [handle]);

  const refreshLists = async () => {
    try {
      const { data } = await portfolioApi.list(handle);
      if (Array.isArray(data.portfolios)) {
        setNames(data.portfolios);
      }
    } catch {
      /* keep existing names if list fails */
    }
    await refreshReports();
  };

  const fetchAllBrandMeta = async () => {
    const responses = await Promise.all(CATEGORIES.map((c) => profileApi.brands(c)));
    const map = {};
    responses.forEach(({ data }) => (data.brands || []).forEach((b) => { map[b.ticker] = b; }));
    setBrandMetaMap(map);
    return map;
  };

  const applyHoldings = (name, rows, source) => {
    sessionStorage.removeItem(draftKey(handle));
    sessionStorage.removeItem(`${draftKey(handle)}_name`);
    setDraftMode(false);
    setDraftName('');
    setActiveName(name);
    setHoldings(rows);
    setSelected(new Set(rows.map((h) => h.Symbol)));
    setLoadSource(source);
  };

  const startNewPortfolio = (carrySelections = false) => {
    sessionStorage.setItem(draftKey(handle), '1');
    setDraftMode(true);
    setActiveName('');
    setHoldings([]);
    setLoadSource('draft');
    if (!carrySelections) {
      setSelected(new Set());
    }
  };

  const openNewModal = () => {
    const suggested = `Portfolio ${new Date().toLocaleDateString()}`;
    setModalName(draftName || suggested);
    setShowNewModal(true);
  };

  const cancelNewModal = () => {
    setShowNewModal(false);
  };

  const confirmNewPortfolio = () => {
    const name = modalName.trim();
    if (!name) return;
    if (names.includes(name)) {
      showAlert('A portfolio with this name already exists. Choose a different name.', {
        variant: 'warning',
        title: 'Name already used',
      });
      return;
    }
    startNewPortfolio(false);
    setDraftName(name);
    sessionStorage.setItem(`${draftKey(handle)}_name`, name);
    setShowNewModal(false);
  };

  const deletePortfolio = async (name, e) => {
    e.stopPropagation();
    const ok = await showConfirm(
      `Portfolio "${name}" will be permanently removed.`,
      {
        title: `Delete "${name}"?`,
        variant: 'danger',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
    );
    if (!ok) return;
    try {
      await portfolioApi.remove(handle, name);
      if (activeName === name) {
        setActiveName('');
        setHoldings([]);
        setSelected(new Set());
        setDraftMode(false);
        setDraftName('');
        setLoadSource('none');
        sessionStorage.removeItem(draftKey(handle));
        sessionStorage.removeItem(`${draftKey(handle)}_name`);
      }
      setNames((prev) => prev.filter((n) => n !== name));
      await refreshLists();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Could not delete portfolio.', {
        variant: 'error',
        title: 'Delete failed',
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const skipAutoLoad = sessionStorage.getItem(draftKey(handle)) === '1';

        const [listRes, profileRes] = await Promise.all([
          portfolioApi.list(handle),
          profileApi.get(handle),
        ]);
        if (cancelled) return;

        const portfolioNames = listRes.data.portfolios || [];
        setNames(portfolioNames);
        await refreshReports();

        await fetchAllBrandMeta();
        if (cancelled) return;

        // Brand grid + sectors for the current category are loaded by the
        // dedicated [category] effect below — avoid a duplicate request here.

        if (skipAutoLoad) {
          setDraftMode(true);
          const savedName = sessionStorage.getItem(`${draftKey(handle)}_name`) || '';
          setDraftName(savedName);
          if (savedName && portfolioNames.includes(savedName)) {
            const { data } = await portfolioApi.get(handle, savedName);
            if (!cancelled && data?.holdings?.length) {
              setActiveName('');
              setHoldings(data.holdings);
              setSelected(new Set(data.holdings.map((h) => h.Symbol)));
              setLoadSource('draft');
              return;
            }
          }
          if (!savedName) {
            setModalName(`Portfolio ${new Date().toLocaleDateString()}`);
            setShowNewModal(true);
          }
          return;
        }

        const smartName = persona && persona !== 'Not Set' ? `Smart ${persona} Portfolio` : null;
        const toOpen = (smartName && portfolioNames.includes(smartName))
          ? smartName
          : portfolioNames.find((n) => /^Smart .+ Portfolio$/.test(n));

        if (toOpen) {
          const { data } = await portfolioApi.get(handle, toOpen);
          if (!cancelled && data?.holdings?.length) {
            applyHoldings(toOpen, data.holdings, 'smart');
            return;
          }
        }

        const profileBrands = profileRes.data.profile?.brands || [];
        if (!cancelled && profileBrands.length) {
          setActiveName('');
          setHoldings([]);
          setSelected(new Set(profileBrands));
          setLoadSource('profile');
        }
      } catch {
        /* backend may be offline */
      }
    })();
    return () => { cancelled = true; };
  }, [handle, persona, refreshReports]);

  useEffect(() => {
    if (pageTab === 'reports') {
      refreshReports();
    }
  }, [pageTab, refreshReports]);

  useEffect(() => {
    if (pageTab === 'analytics' && Object.keys(brandMetaMap).length === 0) {
      fetchAllBrandMeta();
    }
  }, [pageTab]);

  useEffect(() => {
    profileApi.brands(category).then((r) => {
      setBrands(r.data.brands || []);
      setSectors(r.data.sectors || []);
      setSectorFilter('All');
    });
  }, [category]);

  useEffect(() => () => {
    analyzeAbortRef.current?.abort();
  }, []);

  const openPortfolio = async (name) => {
    try {
      const { data } = await portfolioApi.get(handle, name);
      applyHoldings(name, data.holdings || [], 'saved');
      setPageTab('build');
    } catch (err) {
      showAlert(err.response?.data?.error || 'Could not load portfolio.', {
        variant: 'error',
        title: 'Load failed',
      });
    }
  };

  const toggleBrand = (ticker) => {
    if (activeName && !draftMode) {
      const syms = holdings.map((h) => h.Symbol);
      sessionStorage.setItem(draftKey(handle), '1');
      sessionStorage.setItem(`${draftKey(handle)}_name`, activeName);
      setDraftMode(true);
      setDraftName(activeName);
      setHoldings(holdings);
      setLoadSource('draft');
      const next = new Set(syms);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      setSelected(next);
      return;
    }
    if (!draftMode && loadSource === 'profile') {
      setDraftMode(true);
      sessionStorage.setItem(draftKey(handle), '1');
      setLoadSource('draft');
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const saveNew = async () => {
    if (draftMode && !draftName.trim()) {
      openNewModal();
      return;
    }
    const name = draftMode
      ? draftName.trim()
      : (activeName || `Portfolio ${new Date().toLocaleDateString()}`);
    const rows = [...selected].map((sym) => {
      const existing = holdings.find((h) => h.Symbol === sym);
      return existing || { Symbol: sym, Quantity: 10, 'Average Price': 0 };
    });
    const isReplace = names.includes(name);
    setSaving(true);
    try {
      await portfolioApi.save(handle, name, rows);
      applyHoldings(name, rows, 'saved');
      setNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
      await refreshLists();
      await showAlert(
        isReplace
          ? `"${name}" now has your latest stock picks.`
          : `"${name}" is saved. Find it in Saved Portfolios above.`,
        {
          variant: 'success',
          title: isReplace ? 'Portfolio updated' : 'Portfolio saved',
          confirmLabel: 'Got it',
        },
      );
    } catch (err) {
      showAlert(err.response?.data?.error || 'Could not save portfolio. Is the backend running?', {
        variant: 'error',
        title: 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const runAnalyze = async () => {
    if (analyzing) return;

    const { tickers, holdingRows } = resolveAnalyzeTargets({ draftMode, holdings, selected });
    if (!tickers.length) {
      showAlert('Select at least one stock or load a saved portfolio before analyzing.', {
        variant: 'warning',
        title: 'No holdings',
      });
      return;
    }

    const portfolioLabel = activeName || draftName || 'Portfolio';

    setAnalyzing(true);
    setAnalysisStage(ANALYSIS_STAGES[0]);
    showLoader(ANALYSIS_STAGES[0]);

    analyzeAbortRef.current = new AbortController();
    try {
      const { data } = await analyzeApi.run(tickers, handle, holdingRows);
      const taskId = data.task_id;
      let pollCount = 0;

      const graphResult = await pollAnalyzeTask(taskId, {
        signal: analyzeAbortRef.current.signal,
        onPoll: () => {
          pollCount += 1;
          const stage = ANALYSIS_STAGES[Math.min(Math.floor(pollCount / 2), ANALYSIS_STAGES.length - 1)];
          setAnalysisStage(stage);
          updateLoader(stage);
        },
      });

      const chartsStage = 'Building charts and rebalance tables...';
      setAnalysisStage(chartsStage);
      updateLoader(chartsStage);
      let visuals = {};
      try {
        const v = await marketApi.portfolioVisuals(tickers, holdingRows);
        visuals = v.data;
      } catch {
        /* keep prior visuals if refresh fails */
      }

      setAnalysisResult((prev) => ({
        ...graphResult,
        tickers,
        portfolioName: portfolioLabel,
        visuals: Object.keys(visuals).length ? visuals : (prev?.visuals || {}),
      }));
      saveShadowHistory(handle, tickers, graphResult);
      refreshReports();
      await showAlert(
        `Analysis finished for ${portfolioLabel} (${tickers.length} stocks). Scroll down to review charts, or open Reports for the exported file.`,
        {
          variant: 'success',
          title: 'Analysis complete',
          confirmLabel: 'View results',
        },
      );
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      if (err.name === 'AbortError') return; // component unmounted mid-poll
      showAlert(err.response?.data?.error || err.message || 'Analysis failed. Is the backend running?', {
        variant: 'error',
        title: 'Analysis failed',
      });
    } finally {
      setAnalyzing(false);
      setAnalysisStage('');
      hideLoader();
    }
  };

  const openReportFile = async (filename) => {
    if (!handle) return;
    const url = reportsApi.downloadUrl(handle, filename);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadReportFile = async (filename) => {
    showLoader(`Downloading ${shortFilename(filename)}...`);
    try {
      const url = reportsApi.downloadUrl(handle, filename);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      showAlert('Could not download report.', { variant: 'error', title: 'Download failed' });
    } finally {
      hideLoader();
    }
  };

  const runCorr = async () => {
    const tickers = parseTickerInput(corrTickers);
    if (tickers.length < 2) {
      showAlert('Enter at least 2 stock symbols separated by commas (e.g. TCS, INFY, RELIANCE).', {
        variant: 'warning',
        title: 'Need more symbols',
      });
      return;
    }
    setCorrLoading(true);
    setCorrMatrix(null);
    try {
      const { data } = await marketApi.correlation(tickers);
      if (data.matrix && Object.keys(data.matrix).length) {
        setCorrMatrix(data.matrix);
      } else {
        showAlert('Could not build correlation matrix for those symbols.', {
          variant: 'error',
          title: 'No data',
        });
      }
    } catch (err) {
      showAlert(err.response?.data?.error || 'Correlation failed. Check tickers and try again.', {
        variant: 'error',
        title: 'Correlation failed',
      });
    } finally {
      setCorrLoading(false);
    }
  };

  const runRebal = async () => {
    const fromInput = parseTickerInput(corrTickers);
    const tickers = holdings.length
      ? holdings.map((h) => h.Symbol)
      : fromInput;
    if (!tickers.length) {
      showAlert('Enter tickers above or open a saved portfolio in the Build tab.', {
        variant: 'warning',
        title: 'No tickers',
      });
      return;
    }
    const qty = holdings.length
      ? holdings.map((h) => h.Quantity || 10)
      : tickers.map(() => 10);

    const sourceLabel = holdings.length
      ? `${activeName || 'Open portfolio'} · ${holdings.length} stocks`
      : `Typed tickers · ${tickers.length} stocks`;

    setRebalLoading(true);
    setRebalResult(null);
    setRebalSource(sourceLabel);
    try {
      const { data } = await marketApi.rebalance(tickers, qty, rebalMode);
      if (data.rows?.length) {
        setRebalResult(data);
      } else {
        showAlert(data.error || 'Could not calculate rebalance for those symbols.', {
          variant: 'error',
          title: 'Rebalance failed',
        });
      }
    } catch (err) {
      showAlert(err.response?.data?.error || 'Rebalance failed. Check tickers and try again.', {
        variant: 'error',
        title: 'Rebalance failed',
      });
    } finally {
      setRebalLoading(false);
    }
  };

  const filteredBrands = useMemo(() => brands.filter((b) => {
    if (!b || !b.ticker) return false;
    const q = brandSearch.trim().toLowerCase();
    const matchesSearch = !q || b.ticker.toLowerCase().includes(q) || (b.name || '').toLowerCase().includes(q);
    const matchesSector = sectorFilter === 'All' || b.sector === sectorFilter;
    return matchesSearch && matchesSector;
  }), [brands, brandSearch, sectorFilter]);

  const selectedList = useMemo(
    () => [...selected].map((ticker) => brands.find((b) => b.ticker === ticker)
      || brandMetaMap[ticker]
      || {
        ticker,
        ticker_short: ticker.split('.')[0],
        name: ticker.split('.')[0],
        logo: null,
      }),
    [selected, brands, brandMetaMap],
  );

  const displayItems = useMemo(() => {
    if (!draftMode && holdings.length > 0 && activeName) {
      return holdings.map((h) => {
        const sym = h.Symbol;
        const meta = brandMetaMap[sym] || brands.find((b) => b.ticker === sym) || {
          ticker: sym,
          ticker_short: sym.split('.')[0],
          name: sym.split('.')[0],
          logo: null,
        };
        return {
          ...meta,
          weight: h['Weight (%)'],
          assetClass: h['Asset Class'] || h.assetClass,
        };
      });
    }
    return selectedList.map((b) => ({ ...b, weight: null, assetClass: null }));
  }, [holdings, activeName, draftMode, brandMetaMap, brands, selectedList]);

  const itemCount = displayItems.length;
  const canEditSelection = draftMode || loadSource === 'profile' || loadSource === 'draft' || loadSource === 'none';

  const canAnalyze = draftMode ? selected.size > 0 : (holdings.length > 0 || selected.size > 0);

  const reportGroups = useMemo(() => groupReports(reports), [reports]);

  const saveButtonLabel = useMemo(() => {
    if (saving) return 'Saving...';
    if (draftMode) {
      const name = clipLabel(draftName || 'Portfolio');
      return names.includes(draftName) ? `Replace ${name}` : `Save ${name}`;
    }
    if (activeName) return `Update ${clipLabel(activeName)}`;
    return 'Save Portfolio';
  }, [saving, draftMode, draftName, names, activeName]);

  return (
    <PageShell className="portfolio-intelligence">
      <PageHeader
        eyebrow="Portfolio OS"
        icon={<Briefcase size={20} />}
        title="Portfolio intelligence"
        subtitle={`Build, optimize, and analyze holdings · ${persona}`}
      />

      <div className="portfolio-tabs" style={{ marginBottom: '1.25rem' }}>
        <SegmentedControl
          value={pageTab}
          onChange={setPageTab}
          options={PAGE_TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
        />
      </div>

      <AnimatePresence>
        {pageTab === 'build' && (
          <motion.div key="build" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Portfolio strip */}
            <GlassCard className="portfolio-build__saved" style={{ marginBottom: '1rem' }}>
              <div className="portfolio-build__saved-label" style={{ marginBottom: names.length ? 10 : 0 }}>
                <PieChart size={18} color="#10b981" />
                <span>SAVED PORTFOLIOS</span>
              </div>
              <div className="portfolio-build__saved-strip mr-scroll">
                <button
                  type="button"
                  className={`portfolio-saved-chip portfolio-saved-chip--new${draftMode ? ' portfolio-saved-chip--active' : ''}`}
                  onClick={openNewModal}
                >
                  <Plus size={14} /> New
                </button>
                {names.map((n) => {
                  const isActive = (activeName === n && !draftMode) || (draftMode && draftName === n);
                  return (
                    <div
                      key={n}
                      title={n}
                      className={`portfolio-saved-chip${isActive ? ' portfolio-saved-chip--active' : ''}`}
                    >
                      <button
                        type="button"
                        className="portfolio-saved-chip__select"
                        onClick={() => openPortfolio(n)}
                      >
                        <FolderOpen size={14} color={isActive ? '#10b981' : '#64748b'} />
                        <span title={n}>{n}</span>
                      </button>
                      <button
                        type="button"
                        className="portfolio-saved-chip__delete"
                        onClick={(e) => deletePortfolio(n, e)}
                        aria-label={`Delete ${n}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                {names.length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center', paddingLeft: 4 }}>
                    No saved portfolios — pick stocks and save
                  </span>
                )}
              </div>
            </GlassCard>

            {/* Builder split */}
            <div className="pf-split portfolio-build">
              {/* Stock universe */}
              <GlassCard className="portfolio-build__universe pf-split__universe">
                <div className="portfolio-build__universe-head">
                  <h4 className="portfolio-build__universe-title">Pick stocks</h4>
                  <p className="portfolio-build__universe-sub">Choose an index, then tap to add</p>
                </div>

                <div className="portfolio-build__categories" role="tablist" aria-label="Stock index">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={category === c}
                      className={`portfolio-build__category${category === c ? ' portfolio-build__category--active' : ''}`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="portfolio-build__search">
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="portfolio-build__search-input"
                    placeholder={`Search ${category}...`}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                  />
                </div>

                <div className="portfolio-build__sectors mr-scroll">
                  {['All', ...sectors].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`portfolio-build__sector${sectorFilter === s ? ' portfolio-build__sector--active' : ''}`}
                      onClick={() => setSectorFilter(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="portfolio-build__stock-grid mr-scroll">
                  {filteredBrands.map((b) => {
                    const isSelected = selected.has(b.ticker);
                    return (
                      <button
                        key={b.ticker}
                        type="button"
                        className={`portfolio-build__stock-card${isSelected ? ' portfolio-build__stock-card--selected' : ''}`}
                        onClick={() => toggleBrand(b.ticker)}
                      >
                        <img src={b.logo} alt="" />
                        <div className="portfolio-build__stock-meta">
                          <div className="portfolio-build__stock-top">
                            <span className="portfolio-build__stock-ticker">
                              {b.ticker_short || b.ticker.split('.')[0]}
                            </span>
                            {isSelected && (
                              <span className="portfolio-build__stock-check">
                                <Check size={10} color="#000" strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <div className="portfolio-build__stock-name">{b.name}</div>
                          <div className="portfolio-build__stock-sector">{b.sector}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredBrands.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>No stocks match.</p>
                )}
              </GlassCard>

              {/* Selection panel — sticky on desktop, first on mobile */}
              <div className="pf-sticky portfolio-build__panel pf-split__panel" style={{ position: 'sticky', top: 16 }}>
                <GlassCard className="portfolio-build__panel-card">
                  <div className="portfolio-build__panel-head">
                    <h3 className="portfolio-build__panel-title">Your Portfolio</h3>
                    <span className="portfolio-build__panel-count">{itemCount}</span>
                  </div>

                  {loadSource === 'smart' && activeName && !draftMode && (
                    <p className="portfolio-build__panel-note portfolio-build__panel-note--smart">
                      Loaded from Smart Portfolio — <strong>{activeName}</strong>
                    </p>
                  )}
                  {loadSource === 'profile' && !draftMode && (
                    <p className="portfolio-build__panel-note portfolio-build__panel-note--profile">
                      Brand picks from Investor Profile — save or analyze when ready
                    </p>
                  )}
                  {draftMode && draftName && (
                    <p className="portfolio-build__panel-note portfolio-build__panel-note--smart">
                      {names.includes(draftName) ? (
                        <>Replacing: <strong>{draftName}</strong> — change stocks, then save</>
                      ) : (
                        <>Creating: <strong>{draftName}</strong> — pick stocks, then save</>
                      )}
                    </p>
                  )}

                  {activeName && !draftMode && loadSource !== 'smart' && (
                    <p className="portfolio-build__panel-note portfolio-build__panel-note--edit">
                      Editing: <strong style={{ color: '#94a3b8' }}>{activeName}</strong>
                    </p>
                  )}

                  <div className="portfolio-build__holdings mr-scroll">
                    {itemCount === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '2rem 1rem', borderRadius: 12,
                        border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b',
                      }}>
                        <Briefcase size={28} color="#334155" style={{ margin: '0 auto 10px' }} />
                        <p style={{ fontSize: '0.8rem' }}>Complete Investor Profile or pick stocks here</p>
                      </div>
                    ) : (
                      <div className="portfolio-build__holdings-list">
                        {displayItems.map((b) => {
                          const label = b.ticker_short || b.ticker?.split('.')[0];
                          return (
                            <div key={b.ticker} className="portfolio-build__holding">
                              {b.logo ? <img src={b.logo} alt="" /> : <span className="portfolio-build__holding-logo-fallback" aria-hidden />}
                              <div className="portfolio-build__holding-copy">
                                <div className="portfolio-build__holding-ticker">{label}</div>
                                <div className="portfolio-build__holding-meta">
                                  {b.weight != null ? (b.assetClass || b.name) : b.name}
                                </div>
                              </div>
                              <div className="portfolio-build__holding-actions">
                                {b.weight != null ? (
                                  <span className="portfolio-build__holding-weight">{b.weight}%</span>
                                ) : null}
                                {!activeName || canEditSelection ? (
                                <button
                                  type="button"
                                  className="portfolio-build__holding-remove"
                                  onClick={() => toggleBrand(b.ticker)}
                                  aria-label={`Remove ${label}`}
                                >
                                  <X size={12} />
                                </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="portfolio-build__actions">
                    <button
                      type="button"
                      className="portfolio-build__btn portfolio-build__btn--save"
                      onClick={saveNew}
                      disabled={selected.size === 0 || saving}
                    >
                      <Briefcase size={16} />
                      {saveButtonLabel}
                    </button>
                    <button
                      type="button"
                      className="portfolio-build__btn portfolio-build__btn--analyze"
                      onClick={runAnalyze}
                      disabled={!canAnalyze || analyzing}
                    >
                      <Shield size={16} />
                      {analyzing ? 'Analyzing...' : 'Analyze Risk'}
                    </button>
                  </div>
                </GlassCard>
              </div>
            </div>

            <div ref={analysisRef}>
              {analyzing && !analysisResult && (
                <GlassCard style={{
                  padding: '1.25rem', marginTop: '1rem',
                  border: '1px solid rgba(59,130,246,0.25)',
                  background: 'rgba(59,130,246,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6',
                      animation: 'spin 0.9s linear infinite',
                    }} />
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 800, color: '#93c5fd' }}>Analyzing portfolio...</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{analysisStage || ANALYSIS_STAGES[0]}</p>
                    </div>
                  </div>
                </GlassCard>
              )}
              {analysisResult && (
                <PortfolioAnalysisPanel
                  data={analysisResult}
                  portfolioName={analysisResult.portfolioName}
                  isRefreshing={analyzing}
                  refreshStage={analysisStage}
                  onClose={() => setAnalysisResult(null)}
                />
              )}
            </div>
          </motion.div>
        )}

        {pageTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="portfolio-reports-card" style={{ padding: '1.5rem' }}>
              <h3 className="portfolio-reports-card__title">Recent Reports</h3>
              <p className="portfolio-reports-card__desc">
                Analysis outputs from your portfolio runs — click to open, download for offline copy
              </p>

              {analyzing && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem',
                  padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6',
                    animation: 'spin 0.9s linear infinite',
                  }} />
                  <span style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: 600 }}>
                    Analysis in progress — your report will appear here when ready
                  </span>
                </div>
              )}

              {reportsLoading && reportGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                  <div style={{
                    width: 36, height: 36, margin: '0 auto 12px', borderRadius: '50%',
                    border: '3px solid rgba(6,182,212,0.15)', borderTopColor: '#06b6d4',
                    animation: 'spin 0.9s linear infinite',
                  }} />
                  Loading reports...
                </div>
              ) : reportGroups.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 1rem', borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
                }}>
                  <FileText size={36} color="#334155" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#94a3b8', marginBottom: 12 }}>No reports yet</p>
                  <button
                    type="button"
                    onClick={() => setPageTab('build')}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: 'none',
                      background: 'rgba(16,185,129,0.15)', color: '#6ee7b7',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Go to Build →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reportGroups.map((group) => {
                    const primary = group.files.find((f) => f.type === 'html')
                      || group.files.find((f) => f.type === 'pdf')
                      || group.files[0];
                    const label = group.base.replace(/^(market_rover_report_|alphahive_report_)/, 'Report ').replace(/_/g, ' ');
                    return (
                      <div key={group.base} className="report-list-row">
                        <div className={`report-list-row__icon report-list-row__icon--${primary?.type === 'pdf' ? 'pdf' : 'html'}`}>
                          <FileText size={22} color={primary?.type === 'pdf' ? '#fb7185' : '#22d3ee'} />
                        </div>
                        <div className="report-list-row__body">
                          <div className="report-list-row__title" title={group.base}>
                            {label}
                          </div>
                          <div className="report-list-row__meta">
                            {group.modified || '—'}
                            {primary?.size_bytes ? ` · ${formatBytes(primary.size_bytes)}` : ''}
                          </div>
                          <div className="report-list-row__tags">
                            {group.files.map((f) => (
                              <span key={f.filename} className="report-list-row__tag">
                                {f.type}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="report-list-row__actions">
                          {primary?.type === 'html' && (
                            <button
                              type="button"
                              className="report-list-row__btn report-list-row__btn--open"
                              onClick={() => openReportFile(primary.filename)}
                            >
                              <ExternalLink size={14} /> Open HTML
                            </button>
                          )}
                          {group.files.map((f) => (
                            <button
                              key={`dl-${f.filename}`}
                              type="button"
                              className="report-list-row__btn report-list-row__btn--download"
                              onClick={() => downloadReportFile(f.filename)}
                              title={`Download ${f.type.toUpperCase()}`}
                            >
                              <Download size={14} />
                              {f.type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {pageTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="portfolio-analytics-card">
              <h3 className="portfolio-analytics-card__title">Analytics Lab</h3>
              <p className="portfolio-analytics-card__desc">
                Correlation matrix and rebalance suggestions — enter symbols like <code>TCS, INFY</code> (auto-adds .NS)
              </p>

              <div className="portfolio-analytics-toolbar">
                <TickerAutocomplete
                  value={corrTickers}
                  onChange={setCorrTickers}
                  brands={brandMetaMap}
                  placeholder="TCS, INFY, RELIANCE (min 2 for correlation)"
                />
                <div className="portfolio-analytics-toolbar__actions">
                  <button
                    type="button"
                    className="portfolio-analytics-btn portfolio-analytics-btn--corr"
                    onClick={runCorr}
                    disabled={corrLoading}
                  >
                    <TrendingUp size={16} /> {corrLoading ? 'Loading...' : 'Correlation'}
                  </button>
                  <div className="portfolio-analytics-modes" role="tablist" aria-label="Rebalance mode">
                    {[
                      { id: 'safety', label: 'Risk Parity' },
                      { id: 'growth', label: 'Growth' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={rebalMode === id}
                        className={`portfolio-analytics-mode${rebalMode === id ? ' portfolio-analytics-mode--active' : ''}`}
                        onClick={() => setRebalMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="portfolio-analytics-btn portfolio-analytics-btn--rebal"
                    onClick={runRebal}
                    disabled={rebalLoading}
                  >
                    <BarChart2 size={16} /> {rebalLoading ? 'Loading...' : 'Rebalance'}
                  </button>
                </div>
              </div>

              {holdings.length > 0 && (
                <p className="portfolio-analytics-hint">
                  Rebalance uses open portfolio: <strong>{activeName || 'current selection'}</strong> ({holdings.length} stocks)
                </p>
              )}

              {!corrMatrix && !rebalResult && !corrLoading && !rebalLoading && (
                <p className="portfolio-analytics-empty">
                  Enter 2+ tickers for correlation, or run rebalance on your portfolio / ticker list.
                </p>
              )}

              <div className="portfolio-analytics-results mr-grid-auto">
                {(corrMatrix || corrLoading) && (
                  <div className="portfolio-analytics-panel portfolio-analytics-panel--corr">
                    <p className="portfolio-analytics-panel__label">Correlation matrix</p>
                    {corrLoading ? (
                      <div className="portfolio-analytics-panel__loading">Fetching market data...</div>
                    ) : (
                      <CorrelationMatrixTable matrix={corrMatrix} />
                    )}
                  </div>
                )}
                {(rebalResult || rebalLoading) && (
                  <div className="portfolio-analytics-panel portfolio-analytics-panel--rebal">
                    <p className="portfolio-analytics-panel__label">Rebalance plan</p>
                    {rebalSource && (
                      <p className="portfolio-analytics-panel__source">
                        Portfolio: <strong>{rebalSource}</strong>
                      </p>
                    )}
                    {rebalLoading ? (
                      <div className="portfolio-analytics-panel__loading">Running optimization...</div>
                    ) : (
                      <>
                        <DataNotes warnings={rebalResult.warnings} />
                        <RebalanceTable rows={rebalResult.rows} compact />
                      </>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelNewModal}
            className="ah-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="ah-modal portfolio-new-modal glow-ring"
              role="dialog"
              aria-modal="true"
              aria-labelledby="portfolio-new-modal-title"
            >
              <div className="portfolio-new-modal__head">
                <h3 id="portfolio-new-modal-title">New Portfolio</h3>
                <button type="button" onClick={cancelNewModal} aria-label="Close" className="ah-icon-btn">
                  <X size={16} />
                </button>
              </div>

              <p className="portfolio-new-modal__desc">
                Enter a name, then pick stocks and save.
              </p>

              <label className="portfolio-new-modal__label" htmlFor="portfolio-new-name">
                Portfolio name
              </label>
              <input
                id="portfolio-new-name"
                type="text"
                autoFocus
                className="portfolio-new-modal__input"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmNewPortfolio(); }}
                placeholder="e.g. My Growth Portfolio"
              />

              <div className="portfolio-modal__footer">
                <button type="button" onClick={cancelNewModal} className="ah-modal__btn ah-modal__btn--ghost">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmNewPortfolio}
                  disabled={!modalName.trim()}
                  className="ah-modal__btn ah-modal__btn--primary portfolio-new-modal__submit"
                >
                  Create &amp; Select Stocks
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
