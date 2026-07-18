import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info, X } from 'lucide-react';

const CommandModalContext = createContext(null);

const VARIANTS = {
  info: { accent: '#06b6d4', glow: 'rgba(6,182,212,0.15)', Icon: Info },
  success: { accent: '#10b981', glow: 'rgba(16,185,129,0.15)', Icon: CheckCircle2 },
  warning: { accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)', Icon: AlertTriangle },
  error: { accent: '#f43f5e', glow: 'rgba(244,63,94,0.15)', Icon: AlertCircle },
  danger: { accent: '#f43f5e', glow: 'rgba(244,63,94,0.15)', Icon: AlertTriangle },
  confirm: { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', Icon: HelpCircle },
};

function CommandModalOverlay({ modal, onClose }) {
  if (!modal) return null;

  const variant = VARIANTS[modal.variant] || VARIANTS.info;
  const { Icon } = variant;
  const isConfirm = modal.mode === 'confirm';

  const handleConfirm = () => onClose(true);
  const handleCancel = () => onClose(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={isConfirm ? handleCancel : handleConfirm}
      className="ah-modal-overlay"
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="command-modal-title"
        aria-describedby="command-modal-message"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="ah-modal glow-ring"
        style={{
          width: '100%', maxWidth: 440, padding: '1.5rem',
          borderColor: `${variant.accent}33`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.45), 0 0 32px ${variant.glow}`,
          maxHeight: 'min(90dvh, 640px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: variant.glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={variant.accent} />
          </div>
          <div className="ah-modal__body">
            <h3 id="command-modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>
              {modal.title}
            </h3>
            <p id="command-modal-message" style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.55, margin: 0, wordBreak: 'break-word' }}>
              {modal.message}
            </p>
          </div>
          {!isConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              aria-label="Close"
              className="ah-icon-btn"
              style={{ flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="ah-modal__actions">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="ah-modal__btn ah-modal__btn--ghost"
              >
                {modal.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="ah-modal__btn ah-modal__btn--primary"
                style={{
                  background: modal.variant === 'danger'
                    ? 'linear-gradient(45deg,#ef4444,#f43f5e)'
                    : `linear-gradient(45deg,${variant.accent},#6366f1)`,
                }}
              >
                {modal.confirmLabel || 'Confirm'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="ah-modal__btn ah-modal__btn--primary"
              style={{
                background: `linear-gradient(45deg,${variant.accent},#3b82f6)`,
                color: modal.variant === 'warning' ? '#000' : 'white',
              }}
            >
              {modal.confirmLabel || 'OK'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CommandModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    setModal(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const showAlert = useCallback((message, options = {}) => new Promise((resolve) => {
    resolverRef.current = () => resolve();
    setModal({
      mode: 'alert',
      title: options.title || (options.variant === 'error' ? 'Something went wrong' : 'Notice'),
      message: String(message),
      variant: options.variant || 'info',
      confirmLabel: options.confirmLabel || 'OK',
    });
  }), []);

  const showConfirm = useCallback((message, options = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setModal({
      mode: 'confirm',
      title: options.title || 'Are you sure?',
      message: String(message),
      variant: options.variant || 'confirm',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
    });
  }), []);

  const value = useMemo(
    () => ({ showAlert, showConfirm }),
    [showAlert, showConfirm],
  );

  return (
    <CommandModalContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {modal && (
          <CommandModalOverlay key="command-modal" modal={modal} onClose={close} />
        )}
      </AnimatePresence>
    </CommandModalContext.Provider>
  );
}

export function useCommandModal() {
  const ctx = useContext(CommandModalContext);
  if (!ctx) throw new Error('useCommandModal must be used within CommandModalProvider');
  return ctx;
}
