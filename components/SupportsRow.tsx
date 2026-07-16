"use client";

import { motion } from "framer-motion";
import { fadeUp, revealViewport } from "@/lib/motion";

export function SupportsRow() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 pb-24 text-center"
    >
      <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Supports</span>
      <p className="text-base text-text-secondary sm:text-lg">
        <span className="text-text-primary">Multiple Chains</span>
        <span className="mx-3 text-border">·</span>
        <span className="text-text-primary">Thousands of Tokens</span>
        <span className="mx-3 text-border">·</span>
        <span className="text-text-primary">Real-time Data Sources</span>
      </p>
    </motion.div>
  );
}
