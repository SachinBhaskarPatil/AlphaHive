import { useEffect, useState } from 'react';
import { Radio, Bookmark } from 'lucide-react';
import { Eyebrow, Text, Surface } from './ui/primitives';
import { StaggerItem, StaggerList } from './ui/motion';
import { useIsMobile } from '../hooks/useMediaQuery';

export function AnimatedCounter({ value, suffix = '', duration = 900 }) {
  const target = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      start = Math.round(target * eased);
      setDisplay(start);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span className="tabular">{Number.isNaN(target) ? value : `${display}${suffix}`}</span>;
}

export function DailyBriefing({ persona, marketMood, intent, agentCount, moduleCount, hasData }) {
  return (
    <Surface glow className="mission-briefing">
      <div className="mission-briefing__head">
        <Eyebrow>Daily AI briefing</Eyebrow>
        {hasData && (
          <span className="mission-briefing__live"><span className="live-dot" /> Data loaded</span>
        )}
      </div>
      {hasData ? (
        <p className="mission-briefing__text">
          Your <strong>{persona || 'investor'}</strong> workspace has{' '}
          <strong>{agentCount || 0}</strong> platform agent{agentCount === 1 ? '' : 's'} and{' '}
          <strong>{moduleCount}</strong> analysis modules.
          {marketMood && (
            <> Shadow scan: <strong>{marketMood}</strong>.</>
          )}
          {intent && (
            <> Institutional intent from saved signals: <strong>{intent}</strong>.</>
          )}
        </p>
      ) : (
        <p className="mission-briefing__text">
          Your <strong>{persona || 'investor'}</strong> workspace is ready.
          Run <strong>Market Analysis</strong> or open <strong>Shadow Tracker</strong> to populate this briefing from real API data.
        </p>
      )}
    </Surface>
  );
}

export function MarketPulseStrip({ items }) {
  if (!items?.length) return null;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="mission-pulse mission-pulse--static">
        <div className="mission-pulse__static">
          {items.map((item) => (
            <span key={item.label} className="mission-pulse__chip">
              <Radio size={12} /> {item.label}: {item.value}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Tile enough chips to fill wide viewports before the loop repeats
  const tiled = [];
  while (tiled.length < Math.max(items.length * 3, 10)) {
    tiled.push(...items);
  }

  const renderGroup = (groupKey, hidden) => (
    <div className="mission-pulse__group" aria-hidden={hidden || undefined}>
      {tiled.map((item, i) => (
        <span key={`${groupKey}-${item.label}-${i}`} className="mission-pulse__chip">
          <Radio size={12} /> {item.label}: {item.value}
        </span>
      ))}
    </div>
  );

  return (
    <div className="mission-pulse">
      <div className="mission-pulse__track">
        {renderGroup('a', false)}
        {renderGroup('b', true)}
      </div>
    </div>
  );
}

import { normalizeSectorRecord } from '../utils/marketNormalize';

export function SectorHeatStrip({ sectors, onNavigate }) {
  if (!sectors?.length) return null;
  const isMobile = useIsMobile();

  const rows = sectors.map((s, i) => {
    const row = normalizeSectorRecord(s.raw ?? s) || s;
    return { ...row, key: `${row.sector}-${i}` };
  });

  const renderCell = (row, loop) => {
    const flow = row.flow;
    const hot = typeof flow === 'number' ? flow >= 0 : true;
    return (
      <div
        key={`${loop}-${row.key}`}
        data-sector-loop={loop}
        className={`sector-cell sector-cell--${hot ? 'hot' : 'cool'}`}
      >
        <span className="sector-cell__name">{row.sector}</span>
        <span className="sector-cell__val tabular">
          {typeof flow === 'number' ? `${flow >= 0 ? '+' : ''}${flow.toFixed(1)}` : (row.trend || '—')}
        </span>
      </div>
    );
  };

  return (
    <Surface className="mission-sectors">
      <div className="mission-sectors__head">
        <div className="mission-sectors__title">
          <Eyebrow>Sector pulse</Eyebrow>
          <Text faint className="mission-sectors__count">
            {rows.length} sectors · {isMobile ? 'swipe to browse' : 'hover to pause scroll'}
          </Text>
        </div>
        <button type="button" className="ah-btn ah-btn--ghost ah-btn--sm" onClick={() => onNavigate?.('shadow')}>
          Shadow tracker
        </button>
      </div>
      <div
        className={`mission-sectors__track${isMobile ? ' mission-sectors__track--static' : ''}`}
        tabIndex={0}
        aria-label="Sector momentum — scroll horizontally"
      >
        <div className="mission-sectors__scroll">
          {rows.map((row) => renderCell(row, 'a'))}
          {!isMobile && rows.map((row) => renderCell(row, 'b'))}
        </div>
      </div>
    </Surface>
  );
}

export function WatchlistRail({ forecasts, onNavigate }) {
  if (!forecasts?.length) return null;
  return (
    <Surface className="mission-watchlist">
      <div className="mission-watchlist__head">
        <Bookmark size={16} />
        <Eyebrow style={{ margin: 0 }}>Forecast watchlist</Eyebrow>
      </div>
      <div className="mission-watchlist__scroll mr-scroll">
        {forecasts.map((f, i) => (
          <button
            key={f.ticker || f.symbol || i}
            type="button"
            className="watch-chip pressable"
            onClick={() => onNavigate?.('forecasts')}
          >
            <span className="watch-chip__sym">{(f.ticker || f.symbol || '').replace(/\.(NS|BO)$/i, '')}</span>
            <span className="watch-chip__tgt tabular">₹{Number(f.target_price || 0).toFixed(0)}</span>
            <span className="watch-chip__str">{f.strategy || 'Forecast'}</span>
          </button>
        ))}
      </div>
    </Surface>
  );
}

export function UpcomingStrip() {
  return null;
}
