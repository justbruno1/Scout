"use client";

import Image from "next/image";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import type { ExchangeListing, TokenReport } from "@/lib/types";
import {
  formatUsd,
  formatCompact,
  formatPercent,
  formatDate,
  shortenAddress,
  timeAgo,
  cx,
} from "@/lib/utils";
import { Section } from "./Section";
import { Scorecard } from "./Scorecard";
import { PriceTicker } from "./PriceTicker";
import { CountUp } from "./CountUp";
import { ExpandableText } from "./ExpandableText";
import { FollowUpChat } from "./FollowUpChat";

type SecurityCheckStatus = "pass" | "warning" | "fail";

const STATUS_STYLE: Record<SecurityCheckStatus, string> = {
  pass: "text-success",
  warning: "text-warning",
  fail: "text-danger",
};

const STATUS_LABEL: Record<SecurityCheckStatus, string> = {
  pass: "PASS",
  warning: "WARNING",
  fail: "FAIL",
};

function SecurityCheck({
  label,
  status,
  explanation,
}: {
  label: string;
  status: SecurityCheckStatus;
  explanation: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-3 last:border-none sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="flex items-baseline gap-3">
        <span className={cx("w-20 shrink-0 text-xs font-semibold", STATUS_STYLE[status])}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-sm text-text-primary">{label}</span>
      </div>
      <span className="text-xs text-text-secondary sm:max-w-xs sm:text-right">{explanation}</span>
    </div>
  );
}

function exchangeGroups(exchanges: ExchangeListing[]) {
  const cex = exchanges.filter((e) => e.type === "cex").map((e) => e.name);
  const dex = exchanges.filter((e) => e.type === "dex").map((e) => e.name);
  return { cex, dex };
}

export function ReportView({ report }: { report: TokenReport }) {
  const { identity, market, dex, security, topExchanges, scorecard, ai, confidenceScore, partial } =
    report;
  const isUp = (market.change24h ?? 0) >= 0;
  const { cex: cexListings, dex: dexListings } = exchangeGroups(topExchanges);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        {identity.logo ? (
          <Image
            src={identity.logo}
            alt={identity.name}
            width={48}
            height={48}
            className="rounded-full border border-border"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-raised text-sm text-text-secondary">
            {identity.symbol?.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-text-primary">{identity.name}</h1>
            <span className="rounded-md border border-border bg-bg-raised px-2 py-0.5 text-xs text-text-secondary">
              {identity.symbol}
            </span>
          </div>
          {identity.chain && (
            <p className="mt-0.5 text-sm capitalize text-text-secondary">{identity.chain}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6">
        <PriceTicker
          coinId={identity.id}
          initialPriceUsd={market.priceUsd}
          initialSource={market.priceSource}
          initialObservedAt={market.priceObservedAt}
        />
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-danger" />
          )}
          <span
            className={cx("mono-tabular text-sm font-medium", isUp ? "text-success" : "text-danger")}
          >
            {formatPercent(market.change24h)}
          </span>
          <span className="text-sm text-text-secondary">24h</span>
        </div>
      </div>

      <div className="divider mt-12" />

      {/* 1. Live Price & Performance */}
      <Section title="Live Price & Performance">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="1h Change" value={formatPercent(market.change1h)} />
          <Stat label="24h Change" value={formatPercent(market.change24h)} />
          <Stat label="7d Change" value={formatPercent(market.change7d)} />
          <Stat label="30d Change" value={formatPercent(market.change30d)} />
          <Stat label="All-Time High" value={formatUsd(market.ath)} />
          <Stat
            label="ATH Date"
            value={market.athDate ? timeAgo(Date.parse(market.athDate) / 1000) : "—"}
          />
          <Stat label="All-Time Low" value={formatUsd(market.atl)} />
          <Stat
            label="ATL Date"
            value={market.atlDate ? timeAgo(Date.parse(market.atlDate) / 1000) : "—"}
          />
        </div>
      </Section>

      {/* 2. Asset Overview */}
      <Section title="Asset Overview">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Stat label="Category" value={identity.category ?? "—"} />
          <Stat label="Chain" value={identity.chain ?? "—"} capitalize />
          <Stat label="Launch Date" value={formatDate(report.launchDate)} />
          <Stat
            label="Market Cap Rank"
            value={market.marketCapRank ? `#${market.marketCapRank}` : "—"}
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Contract Address</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="mono-tabular text-sm text-text-primary">
                {shortenAddress(identity.contractAddress)}
              </span>
              {security.available && (
                <span
                  className={cx(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    security.isOpenSource
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-danger/30 bg-danger/10 text-danger"
                  )}
                >
                  {security.isOpenSource ? "Verified" : "Unverified"}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-text-secondary">
              Top Exchanges
            </p>
            <div className="flex flex-wrap gap-2">
              {topExchanges.length > 0 ? (
                topExchanges.slice(0, 6).map((e) => (
                  <span
                    key={e.name}
                    className="rounded-full border border-border bg-bg-raised px-3 py-1 text-xs text-text-primary"
                  >
                    {e.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-secondary">—</span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Token Economy */}
      <Section title="Token Economy">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Circulating Supply" value={formatCompact(market.circulatingSupply)} />
          <Stat label="Total Supply" value={formatCompact(market.totalSupply)} />
          <Stat
            label="Max Supply"
            value={market.maxSupply ? formatCompact(market.maxSupply) : "Unlimited"}
          />
          <Stat
            label="Supply Ratio"
            value={
              market.circulatingSupply && market.maxSupply
                ? `${((market.circulatingSupply / market.maxSupply) * 100).toFixed(0)}%`
                : "—"
            }
          />
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-text-secondary">
          {ai.tokenomicsExplanation}
        </p>
      </Section>

      {/* 4. Market & Liquidity Overview */}
      <Section title="Market & Liquidity Overview" unavailable={partial.includes("dex")}>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Market Cap" value={formatUsd(market.marketCap)} />
          <Stat label="FDV" value={formatUsd(market.fdv)} />
          <Stat label="Liquidity" value={formatUsd(dex.totalLiquidityUsd)} />
          <Stat label="Volume 24h" value={formatUsd(market.volume24h)} />
          <Stat
            label="Volume / Market Cap"
            value={
              market.volume24h && market.marketCap
                ? `${((market.volume24h / market.marketCap) * 100).toFixed(1)}%`
                : "—"
            }
          />
          <Stat
            label="Buy Txns 24h"
            value={dex.topPair?.txns24h ? String(dex.topPair.txns24h.buys) : "—"}
          />
          <Stat
            label="Sell Txns 24h"
            value={dex.topPair?.txns24h ? String(dex.topPair.txns24h.sells) : "—"}
          />
          <Stat label="Trading Pairs" value={String(dex.pairCount)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-text-secondary">
              Largest Liquidity Pool
            </p>
            {dex.topPair ? (
              <a
                href={dex.topPair.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {dex.topPair.dexId} · {formatUsd(dex.topPair.liquidityUsd)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-sm text-text-secondary">—</span>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-text-secondary">
              DEX / CEX Distribution
            </p>
            <p className="text-sm text-text-primary">
              {cexListings.length} centralized · {dexListings.length || dex.primaryDexes.length}{" "}
              decentralized venue{(dexListings.length || dex.primaryDexes.length) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-text-secondary">
          {ai.marketLiquidityExplanation}
        </p>
      </Section>

      {/* 5. Security Analysis */}
      <Section title="Security Analysis" unavailable={!security.available}>
        {security.available ? (
          <div className="flex flex-col">
            <SecurityCheck
              label="Honeypot"
              status={security.isHoneypot ? "fail" : "pass"}
              explanation={
                security.isHoneypot
                  ? "This contract may block selling."
                  : "No honeypot behavior detected."
              }
            />
            <SecurityCheck
              label="Ownership"
              status={security.canTakeBackOwnership ? "fail" : "pass"}
              explanation={
                security.canTakeBackOwnership
                  ? "Ownership can be reclaimed by a hidden owner."
                  : "Ownership appears renounced or safely controlled."
              }
            />
            <SecurityCheck
              label="Mint Function"
              status={security.isMintable ? "warning" : "pass"}
              explanation={
                security.isMintable
                  ? "The owner can mint additional supply."
                  : "No mint function detected."
              }
            />
            <SecurityCheck
              label="Blacklist"
              status={security.isBlacklisted ? "fail" : "pass"}
              explanation={
                security.isBlacklisted
                  ? "Contract can blacklist specific wallets."
                  : "No blacklist function detected."
              }
            />
            <SecurityCheck
              label="Trading Restrictions"
              status={security.hasTradingRestrictions ? "warning" : "pass"}
              explanation={
                security.hasTradingRestrictions
                  ? "Buying, selling, or cooldowns may be restricted."
                  : "No trading restrictions detected."
              }
            />
            <SecurityCheck
              label="Proxy Contract"
              status={security.isProxy ? "warning" : "pass"}
              explanation={
                security.isProxy
                  ? "Contract logic can be upgraded after launch."
                  : "Not an upgradeable proxy contract."
              }
            />
            <SecurityCheck
              label="Verified Contract"
              status={security.isOpenSource ? "pass" : "warning"}
              explanation={
                security.isOpenSource
                  ? "Source code is published and verified."
                  : "Source code is not verified."
              }
            />
            <SecurityCheck
              label="Locked Liquidity"
              status={
                security.lockedLiquidity === "locked"
                  ? "pass"
                  : security.lockedLiquidity === "unlocked"
                  ? "warning"
                  : "warning"
              }
              explanation={
                security.lockedLiquidity === "locked"
                  ? "Liquidity appears locked."
                  : security.lockedLiquidity === "unlocked"
                  ? "Liquidity does not appear to be locked."
                  : "Liquidity lock status isn't available."
              }
            />
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Contract security data isn&apos;t available for this token&apos;s chain right now.
          </p>
        )}
      </Section>

      {/* 6. Holder Distribution */}
      <Section title="Holder Distribution" unavailable={!security.available}>
        {security.available && security.top10HolderPercent !== undefined ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat
              label="Holder Count"
              value={security.holderCount ? formatCompact(security.holderCount) : "—"}
            />
            <Stat
              label="Largest Holder"
              value={
                security.largestHolderPercent !== undefined
                  ? `${security.largestHolderPercent.toFixed(1)}%`
                  : "—"
              }
            />
            <Stat label="Top 10 Holders" value={`${security.top10HolderPercent.toFixed(0)}%`} />
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary">
                Whale Concentration
              </p>
              <p
                className={cx(
                  "mt-1 text-base",
                  security.top10HolderPercent < 30
                    ? "text-success"
                    : security.top10HolderPercent < 60
                    ? "text-warning"
                    : "text-danger"
                )}
              >
                {security.top10HolderPercent < 30
                  ? "Healthy Distribution"
                  : security.top10HolderPercent < 60
                  ? "Moderate Risk"
                  : "High Concentration Risk"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Holder data unavailable for this chain.</p>
        )}
      </Section>

      {/* 7. Decision Scorecard — shown right before the Investment Thesis */}
      <div className="py-10">
        <Scorecard scorecard={scorecard} />
        <div className="divider mt-10" />
      </div>

      {/* 8. AI Investment Thesis */}
      <Section title="Investment Thesis">
        <ExpandableText text={ai.investmentThesis} limit={420} />
      </Section>

      {/* 9. Supporting Evidence */}
      {ai.supportingReasons.length > 0 && (
        <Section title="Supporting Evidence">
          <ul className="flex flex-col gap-3">
            {ai.supportingReasons.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 10. Key Risks + What Would Change This Outlook */}
      {ai.keyRisks.length > 0 && (
        <Section title="Key Risks">
          <ul className="flex flex-col gap-3">
            {ai.keyRisks.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(ai.outlookPositive.length > 0 || ai.outlookNegative.length > 0) && (
        <Section title="What Would Change This Outlook?">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {ai.outlookPositive.length > 0 && (
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-success">
                  Would strengthen the case
                </p>
                <ul className="flex flex-col gap-2.5">
                  {ai.outlookPositive.map((o) => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.outlookNegative.length > 0 && (
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-danger">
                  Would weaken the case
                </p>
                <ul className="flex flex-col gap-2.5">
                  {ai.outlookNegative.map((o) => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 11. Analyst's Verdict — short closing summary box */}
      {ai.analystVerdict && (
        <div className="mb-10 rounded-2xl border border-accent/30 bg-accent/[0.06] p-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">
            Analyst&apos;s Verdict
          </p>
          <p className="text-[15px] leading-relaxed text-text-primary">{ai.analystVerdict}</p>
        </div>
      )}

      {/* 12. Confidence Score — computed deterministically, the AI only explains it */}
      <Section title="Confidence Score">
        <CountUp
          value={confidenceScore}
          formatter={(n) => `${Math.round(n)}%`}
          className="mono-tabular text-3xl font-medium text-text-primary"
        />
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{ai.confidenceReasoning}</p>
        <p className="mt-4 text-xs text-text-secondary">
          Scout explains data and risk — it never gives financial advice. You decide.
        </p>
      </Section>

      {/* Follow-up chat */}
      <FollowUpChat report={report} />
    </div>
  );
}

function Stat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={cx("mono-tabular mt-1 text-base text-text-primary", capitalize && "capitalize")}>
        {value}
      </p>
    </div>
  );
}
