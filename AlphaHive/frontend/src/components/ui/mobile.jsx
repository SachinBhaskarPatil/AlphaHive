import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Button, IconButton } from './primitives';

export function FloatingActionButton({ onClick, label = 'Ask AI swarm', icon: Icon = Sparkles }) {
  return (
    <motion.button
      type="button"
      className="ah-fab pressable"
      onClick={onClick}
      aria-label={label}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.2 }}
      whileTap={{ scale: 0.92 }}
    >
      <span className="ah-fab__ring" aria-hidden />
      <Icon size={22} />
      <span className="ah-fab__label">{label}</span>
    </motion.button>
  );
}

export function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="ah-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="ah-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="ah-sheet__handle" aria-hidden />
            <div className="ah-sheet__head">
              <h3>{title}</h3>
              <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
            </div>
            <div className="ah-sheet__body mr-scroll">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileActionSheet({ open, onClose, actions }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Quick actions">
      <div className="ah-action-sheet">
        {actions.map(({ id, label, desc, icon: Icon, onClick }) => (
          <button key={id} type="button" className="ah-action-sheet__item pressable" onClick={() => { onClick(); onClose(); }}>
            <span className="ah-action-sheet__icon">{Icon && <Icon size={18} />}</span>
            <span>
              <span className="ah-action-sheet__label">{label}</span>
              {desc && <span className="ah-action-sheet__desc">{desc}</span>}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export function PullToRefreshHint({ refreshing, onRefresh }) {
  return (
    <button type="button" className="ah-ptr pressable" onClick={onRefresh} disabled={refreshing}>
      {refreshing ? 'Refreshing…' : 'Pull to refresh intelligence'}
    </button>
  );
}
