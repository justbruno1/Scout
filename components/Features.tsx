"use client";

import { motion } from "framer-motion";
import { Activity, Sparkles, ShieldAlert, SearchCode } from "lucide-react";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";

const FEATURES = [
  {
    icon: Activity,
    title: "Real-Time Market Data",
    description:
      "Live price, market cap, FDV, liquidity, volume and tokenomics aggregated from trusted market data sources.",
  },
  {
    icon: Sparkles,
    title: "AI Research",
    description:
      "AI-powered synthesis turns raw blockchain and market data into an evidence-backed investment thesis.",
  },
  {
    icon: ShieldAlert,
    title: "Security Detection",
    description:
      "Contract security scanning via GoPlus surfaces honeypots, mint functions, ownership risks, and blacklist controls.",
  },
  {
    icon: SearchCode,
    title: "Natural Language Search",
    description:
      "Type a ticker, a name, a contract address, or just ask in plain English — and Scout figures out what you mean.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-4xl px-6 py-20">
      <div className="divider mb-20" />
      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        className="flex flex-col"
      >
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} variants={fadeUp}>
            <div className="grid grid-cols-1 gap-4 py-10 sm:grid-cols-[auto_1fr] sm:gap-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-raised text-accent">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-xl font-medium text-text-primary">{f.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
                  {f.description}
                </p>
              </div>
            </div>
            {i < FEATURES.length - 1 && <div className="divider" />}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
