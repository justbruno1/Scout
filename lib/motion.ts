// Shared animation tokens so every section of Scout scrolls with the same
// smooth, premium feel (same easing curve, same travel distance) instead of
// each component inventing its own timing.

export const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const; // "easeOutExpo" feel

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_SMOOTH },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE_SMOOTH } },
};

export const staggerContainer = (stagger = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Standard viewport options for scroll-triggered reveals. */
export const revealViewport = { once: true, margin: "-80px" as const };
