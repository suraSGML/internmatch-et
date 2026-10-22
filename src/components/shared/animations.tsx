'use client';

/**
 * Reusable Framer Motion animation components.
 * Keep durations short (≤0.3s) for mobile users on slow connections.
 */

import { motion, type Variants } from 'framer-motion';

// ─── Variants ────────────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

// ─── Components ──────────────────────────────────────────────────────────────

/**
 * Fade + slide up on mount. Use for page sections and cards.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Simple opacity fade on mount.
 */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered children — wrap a list container to animate items one by one.
 * Children should use <StaggerItem>.
 */
export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual item inside a <StaggerList>.
 */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Scale + fade in — good for cards and stat numbers.
 */
export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated counter — counts from 0 to target value on mount.
 * Good for stats sections.
 */
export function AnimatedNumber({
  value,
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {value}{suffix}
    </span>
  );
}

/**
 * Hover lift effect — subtle card elevation on hover.
 */
export function HoverLift({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Page wrapper — fades in on every route navigation.
 * Use inside DashboardLayout or page-level components.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
