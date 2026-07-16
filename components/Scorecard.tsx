"use client";

import { motion } from "framer-motion";
import type { Scorecard as ScorecardType, ScorecardRow } from "@/lib/types";
import { fadeUp, revealViewport, staggerContainer } from "@/lib/motion";

const STATUS_ICON: Record<ScorecardRow["status"], string> = {
  good: "✅",
  warn: "🟡",
  bad: "🔴",
  unknown: "⚪",
};

function scoreColor(score: number): string {
  if (score >= 65) return "#3DDC84";
  if (score >= 40) return "#FFB547";
  return "#FF5D5D";
}

export function Scorecard({ scorecard }: { scorecard: ScorecardType }) {
  const rows: ScorecardRow[] = [
    scorecard.security,
    scorecard.liquidity,
    scorecard.momentum,
    scorecard.volume,
    scorecard.holderDistribution,
    scorecard.tokenAge,
    scorecard.volatility,
  ];

  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (scorecard.overallHealthScore / 100) * circumference;
  const color = scoreColor(scorecard.overallHealthScore);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      className="rounded-2xl border border-border bg-bg-raised p-6 sm:p-8"
    >
      <h2 className="mb-6 text-lg font-medium text-text-primary">Decision Scorecard</h2>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="flex flex-1 flex-col gap-4"
        >
          {rows.map((row) => (
            <motion.div
              key={row.label}
              variants={fadeUp}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-text-secondary">{row.label}</span>
              <span className="flex items-center gap-2 font-medium text-text-primary">
                <span aria-hidden>{STATUS_ICON[row.status]}</span>
                {row.detail}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex shrink-0 flex-col items-center gap-3 sm:pl-8">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#232629" strokeWidth="6" />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                whileInView={{ strokeDashoffset: offset }}
                viewport={revealViewport}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mono-tabular text-xl font-medium text-text-primary">
                {scorecard.overallHealthScore}
              </span>
              <span className="text-[10px] text-text-secondary">/ 100</span>
            </div>
          </div>
          <span className="text-xs uppercase tracking-wide text-text-secondary">
            Overall Health
          </span>
        </div>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-text-secondary">
        {scorecard.overallExplanation}
      </p>
    </motion.div>
  );
}
