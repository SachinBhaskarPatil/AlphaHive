import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';

export default function CommandPalette({ open, onClose, items, onSelect }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => `${it.label} ${it.desc}`.toLowerCase().includes(q));
  }, [query, items]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[active]; if (it) { onSelect(it.id); onClose(); } }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ah-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ah-palette glow-ring"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ah-palette__search">
              <Search size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search destinations, agents, modules…"
              />
              <span className="ah-chip">ESC</span>
            </div>
            <div className="ah-palette__list mr-scroll">
              {filtered.length === 0 && (
                <p className="ah-palette__empty">No matches for &ldquo;{query}&rdquo;</p>
              )}
              {filtered.map((it, i) => {
                const Icon = it.icon;
                const isActive = i === active;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`ah-palette__item${isActive ? ' ah-palette__item--active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { onSelect(it.id); onClose(); }}
                  >
                    <span className="ah-palette__item-icon"><Icon size={17} /></span>
                    <span className="ah-palette__item-copy">
                      <span className="ah-palette__item-label">{it.label}</span>
                      <span className="ah-palette__item-desc">{it.desc}</span>
                    </span>
                    {isActive && <ArrowRight size={15} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
