"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SearchBar } from "./SearchBar";
import { NeuralSphere } from "./NeuralSphere";
import { LiveTicker } from "./LiveTicker";
import { Marquee } from "./Marquee";
import { EASE_SMOOTH } from "@/lib/motion";

const DATA_SOURCES = ["CoinGecko", "DexScreener", "GeckoTerminal", "GoPlus Security"];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const sphereY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const sphereOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center px-6 pb-16 pt-24 text-center sm:pt-32"
    >
      <motion.div
        style={{ y: sphereY, opacity: sphereOpacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE_SMOOTH }}
        className="mb-6"
      >
        <NeuralSphere size={140} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: EASE_SMOOTH }}
        className="max-w-3xl text-balance text-4xl font-medium leading-[1.1] tracking-tight text-text-primary sm:text-6xl"
      >
        Research any <span className="text-accent">token.</span>
        <br />
        Understand every <span className="text-accent">move.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE_SMOOTH }}
        className="mt-6 max-w-xl text-balance text-base text-text-secondary sm:text-lg"
      >
        Scout is an AI research analyst that reads the market, the chain, and the
        crowd — then explains it to you in plain English.
      </motion.p>

      <motion.div
        id="hero-search"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: EASE_SMOOTH }}
        className="mt-10 flex w-full scroll-mt-28 flex-col items-center"
      >
        <LiveTicker />
        <SearchBar autoFocus />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mt-14 w-full max-w-xl"
      >
        <Marquee>
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary">
            Live data from
          </span>
          {DATA_SOURCES.map((s) => (
            <span key={s} className="flex items-center gap-10">
              <span className="text-sm text-text-secondary">{s}</span>
              <span className="text-border">•</span>
            </span>
          ))}
        </Marquee>
      </motion.div>
    </section>
  );
}
