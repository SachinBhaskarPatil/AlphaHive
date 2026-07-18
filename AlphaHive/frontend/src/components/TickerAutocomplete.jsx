import {
  useMemo, useState, useRef, useLayoutEffect, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

export default function TickerAutocomplete({
  value, onChange, brands = {}, placeholder, allowMultiple = true, onEnter,
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const partial = useMemo(() => {
    const parts = value.split(',');
    return parts[parts.length - 1].trim().toLowerCase();
  }, [value]);

  const committed = useMemo(() => {
    const idx = value.lastIndexOf(',');
    return idx === -1 ? '' : `${value.slice(0, idx + 1)} `;
  }, [value]);

  const already = useMemo(() => new Set(
    value.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
  ), [value]);

  const suggestions = useMemo(() => {
    if (!partial) return [];
    const needle = partial.toLowerCase();
    return Object.values(brands).filter((b) => {
      if (!b || !b.ticker) return false;
      const short = (b.ticker_short || b.ticker.split('.')[0] || '').toUpperCase();
      if (already.has(short) || already.has(b.ticker.toUpperCase())) return false;
      const name = (b.name || '').toLowerCase();
      return (
        short.includes(partial.toUpperCase())
        || b.ticker.toLowerCase().includes(needle)
        || name.includes(needle)
      );
    }).slice(0, 8);
  }, [brands, partial, already]);

  const showDropdown = open && partial.length > 0 && suggestions.length > 0;

  const updateMenuPosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const maxWidth = Math.min(rect.width, window.innerWidth - 16);
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - maxWidth - 8)),
      width: maxWidth,
      zIndex: 10000,
    });
  };

  useLayoutEffect(() => {
    if (!showDropdown) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [showDropdown, suggestions.length, value]);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showDropdown]);

  const pick = (b) => {
    const short = b.ticker_short || b.ticker.split('.')[0];
    if (allowMultiple) {
      onChange(`${committed}${short}, `);
    } else {
      onChange(short);
    }
    setOpen(true);
  };

  const dropdown = showDropdown && menuStyle ? createPortal(
    <div className="mr-scroll mr-ticker-dropdown" style={menuStyle}>
      {suggestions.map((b) => {
        const short = b.ticker_short || b.ticker.split('.')[0];
        return (
          <button
            key={b.ticker}
            type="button"
            className="mr-ticker-dropdown__item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(b)}
          >
            {b.logo && (
              <img src={b.logo} alt="" className="mr-ticker-dropdown__logo" />
            )}
            <div className="mr-ticker-dropdown__meta">
              <div className="mr-ticker-dropdown__symbol">
                {short}
                <span style={{ color: '#64748b', fontWeight: 600, marginLeft: 6 }}>{b.ticker}</span>
              </div>
              <div className="mr-ticker-dropdown__name">
                {b.name}
                {b.sector ? ` · ${b.sector}` : ''}
              </div>
            </div>
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div
      ref={anchorRef}
      className={`mr-ticker-autocomplete${showDropdown ? ' mr-ticker-autocomplete--open' : ''}`}
    >
      <Search size={16} className="mr-ticker-autocomplete__icon" />
      <input
        className="mr-ticker-autocomplete__input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter && !showDropdown) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />
      {dropdown}
    </div>
  );
}
