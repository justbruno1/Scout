"use client";

import { motion, AnimatePresence } from "framer-motion";

interface MascotProps {
  status?: string;
  size?: number;
  active?: boolean;
}

/**
 * Scout's temporary mascot: a small floating drone with a single eye.
 * Idle: gentle float + slow blink.
 * Active (during analysis): faster pulse + status text beneath it.
 */
export function Mascot({ status, size = 64, active = false }: MascotProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: size, height: size }}
        className="relative"
      >
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="drop-shadow-[0_0_18px_rgba(200,255,61,0.15)]"
        >
          {/* body */}
          <ellipse cx="50" cy="52" rx="34" ry="26" fill="#1B1E21" stroke="#232629" strokeWidth="1.5" />
          {/* top fin */}
          <path d="M38 30 Q50 14 62 30" fill="none" stroke="#232629" strokeWidth="3" strokeLinecap="round" />
          {/* eye housing */}
          <circle cx="50" cy="52" r="16" fill="#111315" stroke="#2c3033" strokeWidth="1.5" />
          {/* eye */}
          <motion.circle
            cx="50"
            cy="52"
            r={active ? 8 : 6}
            fill="#C8FF3D"
            animate={
              active
                ? { r: [7, 9, 7], opacity: [0.85, 1, 0.85] }
                : { opacity: [1, 0.3, 1] }
            }
            transition={
              active
                ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                : { duration: 3.2, repeat: Infinity, times: [0, 0.08, 0.16], repeatDelay: 2.4 }
            }
            style={{ filter: "drop-shadow(0 0 6px rgba(200,255,61,0.7))" }}
          />
          {/* side thrusters */}
          <circle cx="20" cy="52" r="4" fill="#232629" />
          <circle cx="80" cy="52" r="4" fill="#232629" />
        </svg>
      </motion.div>

      <AnimatePresence mode="wait">
        {status && (
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-text-secondary tracking-wide"
          >
            {status}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
