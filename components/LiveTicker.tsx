"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatUsd, formatPercent, cx } from "@/lib/utils";

interface Reading {
  symbol: string;
  priceUsd?: number;
  change24h?: number;
}

const ROTATE_MS = 8000;

export function LiveTicker() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ticker");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.readings) && data.readings.length > 0) {
          setReadings(data.readings);
        }
      } catch {
        /* keep ticker hidden if the API is unavailable */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    const refresh = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    if (readings.length === 0) return;
    rotateRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % readings.length);
    }, ROTATE_MS);
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current);
    };
  }, [readings.length]);

  if (!loaded || readings.length === 0) {
    return (
      <div className="mb-6 h-6 w-48 animate-pulse rounded-full bg-bg-raised" aria-hidden />
    );
  }

  const current = readings[index % readings.length];
  const isUp = (current.change24h ?? 0) >= 0;

  return (
    <div className="mb-6 flex h-6 items-center gap-2 overflow-hidden text-sm">
      <span className="text-text-secondary">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
        LIVE:
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={current.symbol}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mono-tabular flex items-center gap-2"
        >
          <span className="font-medium text-text-primary">{current.symbol}</span>
          <span className="text-text-primary">{formatUsd(current.priceUsd)}</span>
          <span className={cx(isUp ? "text-success" : "text-danger")}>
            {formatPercent(current.change24h)}
          </span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
