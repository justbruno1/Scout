"use client";

import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/utils";

interface PriceTickerProps {
  coinId: string;
  initialPriceUsd?: number;
  initialSource?: string;
  initialObservedAt?: number;
}

/** Refreshes every 20s while the user stays on the report page. */
const POLL_INTERVAL_MS = 20_000;

export function PriceTicker({
  coinId,
  initialPriceUsd,
  initialSource,
  initialObservedAt,
}: PriceTickerProps) {
  const [price, setPrice] = useState(initialPriceUsd);
  const [source, setSource] = useState(initialSource);
  const [observedAt, setObservedAt] = useState(initialObservedAt ?? Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch(`/api/price?id=${encodeURIComponent(coinId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.priceUsd === "number") setPrice(data.priceUsd);
        if (data.source) setSource(data.source);
        if (typeof data.observedAt === "number") setObservedAt(data.observedAt);
      } catch {
        /* keep showing the last known price rather than erroring the UI */
      }
    }

    const poll = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [coinId]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.round((Date.now() - observedAt) / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [observedAt]);

  const freshnessLabel =
    secondsAgo < 5
      ? "just now"
      : secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-secondary">Current Price</p>
      <p className="mono-tabular mt-1 text-3xl font-medium text-text-primary">
        {formatUsd(price)}
      </p>
      {source && (
        <p className="mt-1.5 text-xs text-text-secondary">
          Source: <span className="text-text-primary">{source}</span> · Updated{" "}
          {freshnessLabel}
        </p>
      )}
    </div>
  );
}
