"use client";

import { motion } from "framer-motion";
import { fadeUp, revealViewport } from "@/lib/motion";
import { cx } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    title: "Search any token",
    description: "Enter a ticker, token name, or contract address.",
  },
  {
    number: "02",
    title: "Scout collects live data",
    description: "From CoinGecko, DexScreener, GeckoTerminal, and GoPlus Security.",
  },
  {
    number: "03",
    title: "AI verifies and analyzes",
    description: "Price, liquidity, volume, holder health, security, and tokenomics.",
  },
  {
    number: "04",
    title: "Scout synthesizes everything",
    description: "Into a single evidence-backed investment thesis.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-24">
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        className="mb-16 text-center text-2xl font-medium text-text-primary sm:text-3xl"
      >
        How Scout Works
      </motion.h2>

      <div className="flex flex-col">
        {STEPS.map((step, i) => (
          <div key={step.number}>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={revealViewport}
              className={cx(
                "flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:gap-12",
                i % 2 === 1 && "sm:flex-row-reverse"
              )}
            >
              <span className="font-mono text-5xl font-light text-accent/70 sm:text-6xl">
                {step.number}
              </span>
              <div className={cx("sm:max-w-md", i % 2 === 1 && "sm:text-right")}>
                <h3 className="text-xl font-medium text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="flex justify-center text-border">↓</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
