import { forwardRef } from 'react';
import { motion } from 'framer-motion';

/* ============================================================
   AlphaHive V2 · Premium Component Primitives
   ============================================================ */

export const Eyebrow = ({ children, className = '' }) => (
  <p className={`ah-eyebrow ${className}`}>{children}</p>
);

export const Heading = ({ as: Tag = 'h2', size = 'lg', className = '', children, ...rest }) => (
  <Tag className={`ah-heading ah-heading--${size} ${className}`} {...rest}>{children}</Tag>
);

export const Text = ({ muted, faint, className = '', children, ...rest }) => (
  <p className={`ah-text${muted ? ' ah-text--muted' : ''}${faint ? ' ah-text--faint' : ''} ${className}`} {...rest}>
    {children}
  </p>
);

export const Button = forwardRef(({
  variant = 'primary', size = 'md', magnetic = true, className = '', children, ...rest
}, ref) => (
  <button
    ref={ref}
    className={`ah-btn ah-btn--${variant} ah-btn--${size}${magnetic ? ' pressable' : ''} ${className}`}
    {...rest}
  >
    {children}
  </button>
));
Button.displayName = 'Button';

export const IconButton = forwardRef(({ className = '', children, label, ...rest }, ref) => (
  <button ref={ref} aria-label={label} className={`ah-icon-btn pressable ${className}`} {...rest}>
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

export function Surface({
  children, className = '', interactive = false, glow = false, padding = true, ...rest
}) {
  return (
    <div
      className={`ah-surface${interactive ? ' ah-surface--interactive' : ''}${glow ? ' glow-ring' : ''}${padding ? ' ah-surface--pad' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Card({
  children, className = '', interactive = false, glow = false, header, footer, ...rest
}) {
  return (
    <Surface interactive={interactive} glow={glow} className={`ah-card ${className}`} {...rest}>
      {header && <div className="ah-card__header">{header}</div>}
      <div className="ah-card__body">{children}</div>
      {footer && <div className="ah-card__footer">{footer}</div>}
    </Surface>
  );
}

export const Badge = ({ children, tone = 'blue', live = false, className = '' }) => (
  <span className={`ah-badge ah-badge--${tone} ${className}`}>
    {live && <span className="live-dot" aria-hidden />}
    {children}
  </span>
);

export const Chip = ({ children, live = false, className = '' }) => (
  <span className={`ah-chip ${className}`}>
    {live && <span className="live-dot" aria-hidden />}
    {children}
  </span>
);

export const Input = forwardRef(({ className = '', mono = false, ...rest }, ref) => (
  <input ref={ref} className={`ah-input${mono ? ' font-mono' : ''} ${className}`} {...rest} />
));
Input.displayName = 'Input';

export const Select = forwardRef(({ className = '', children, ...rest }, ref) => (
  <select ref={ref} className={`ah-input ah-select ${className}`} {...rest}>{children}</select>
));
Select.displayName = 'Select';

export function PageHeader({ eyebrow, title, subtitle, actions, icon }) {
  return (
    <header className="ah-page-header">
      <div className="ah-page-header__main">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div className="ah-page-header__title-row">
          {icon && <span className="ah-page-header__icon">{icon}</span>}
          <Heading as="h1" size="xl">{title}</Heading>
        </div>
        {subtitle && <Text muted className="ah-page-header__sub">{subtitle}</Text>}
      </div>
      {actions && <div className="ah-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Section({ title, desc, actions, children, className = '' }) {
  return (
    <section className={`ah-section ${className}`}>
      {(title || actions) && (
        <div className="ah-section__head">
          <div>
            {title && <Heading as="h3" size="md">{title}</Heading>}
            {desc && <Text muted className="ah-section__desc">{desc}</Text>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyWorkspace({ icon, title, description, action }) {
  return (
    <motion.div className="ah-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {icon && <div className="ah-empty__icon">{icon}</div>}
      {title && <p className="ah-empty__title">{title}</p>}
      {description && <p className="ah-empty__desc">{description}</p>}
      {action}
    </motion.div>
  );
}

export function Skeleton({ width, height = 16, className = '', rounded = 'md' }) {
  return (
    <div
      className={`mr-skeleton ah-skeleton ah-skeleton--${rounded} ${className}`}
      style={{ width: width || '100%', height }}
      aria-hidden
    />
  );
}

export function Divider({ className = '' }) {
  return <div className={`ah-divider ${className}`} role="separator" />;
}

export function Grid({ cols = 'auto', gap = 'md', className = '', children }) {
  return (
    <div className={`ah-grid ah-grid--${cols} ah-grid--gap-${gap} ${className}`}>
      {children}
    </div>
  );
}
