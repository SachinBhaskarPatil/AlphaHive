import { motion } from 'framer-motion';

export const spring = { type: 'spring', stiffness: 380, damping: 32 };
export const easeOut = [0.16, 1, 0.3, 1];

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.45, ease: easeOut },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.4, ease: easeOut },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

export function MotionPage({ children, className = '' }) {
  return (
    <motion.div className={className} {...fadeUp}>
      {children}
    </motion.div>
  );
}

export function StaggerList({ children, className = '' }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
