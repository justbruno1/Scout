"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { TokenReport } from "@/lib/types";
import { formatUsd, formatPercent } from "@/lib/utils";
import { fadeUp, revealViewport } from "@/lib/motion";

interface ComparisonTableProps {
  tokens: TokenReport[];
  aiConclusion: string;
  notFound?: string[];
}

const ROWS: { label: string; get: (r: TokenReport) => string }[] = [
  { label: "Price", get: (r) => formatUsd(r.market.priceUsd) },
  { label: "24h Change", get: (r) => formatPercent(r.market.change24h) },
  { label: "7d Change", get: (r) => formatPercent(r.market.change7d) },
  { label: "Market Cap", get: (r) => formatUsd(r.market.marketCap) },
  { label: "Volume 24h", get: (r) => formatUsd(r.market.volume24h) },
  { label: "Liquidity", get: (r) => formatUsd(r.dex.totalLiquidityUsd) },
  { label: "Overall Health", get: (r) => `${r.scorecard.overallHealthScore}/100` },
  { label: "Confidence", get: (r) => `${r.confidenceScore}%` },
];

export function ComparisonTable({ tokens, aiConclusion, notFound }: ComparisonTableProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-medium text-text-primary"
      >
        {tokens.map((t) => t.identity.symbol).join(" vs ")}
      </motion.h1>

      {notFound && notFound.length > 0 && (
        <p className="mt-3 text-sm text-warning">
          Couldn&apos;t find data for: {notFound.join(", ")}
        </p>
      )}

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 text-left text-xs uppercase tracking-wide text-text-secondary">
                Metric
              </th>
              {tokens.map((t) => (
                <th key={t.identity.id} className="py-3 text-left">
                  <div className="flex items-center gap-2">
                    {t.identity.logo && (
                      <Image
                        src={t.identity.logo}
                        alt={t.identity.name}
                        width={22}
                        height={22}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-text-primary">
                      {t.identity.symbol}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border-subtle">
                <td className="py-3.5 text-sm text-text-secondary">{row.label}</td>
                {tokens.map((t) => (
                  <td key={t.identity.id} className="mono-tabular py-3.5 text-sm text-text-primary">
                    {row.get(t)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divider my-12" />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        className="grid grid-cols-1 gap-8 sm:grid-cols-2"
      >
        {tokens.map((t) => (
          <div key={t.identity.id}>
            <h3 className="mb-2 text-sm font-medium text-text-primary">
              {t.identity.symbol} Investment Thesis
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              {t.ai.investmentThesis}
            </p>
          </div>
        ))}
      </motion.div>

      <div className="divider my-12" />

      <h2 className="mb-4 text-lg font-medium text-text-primary">AI Conclusion</h2>
      <p className="text-[15px] leading-relaxed text-text-secondary">{aiConclusion}</p>
      <p className="mt-4 text-xs text-text-secondary">
        Scout explains data and risk — it never gives financial advice. You decide.
      </p>
    </div>
  );
}
