import type {
  DexData,
  HealthScores,
  MarketData,
  Scorecard,
  ScorecardRow,
  SecurityData,
} from "./types";

function row(label: string, status: ScorecardRow["status"], detail: string): ScorecardRow {
  return { label, status, detail };
}

/**
 * Computes the full Decision Scorecard shown before the AI's Investment
 * Thesis. Every row is derived from a real, retrieved metric — the AI is
 * only ever allowed to *reference* this scorecard, never recompute it.
 *
 * @param tokenAgeDays  days since launch (genesis date, or oldest known
 *                      liquidity pair as a proxy when genesis date is
 *                      unavailable)
 * @param volumeTrendPercent  % change in trading volume comparing the most
 *                      recent ~24h window to the prior ~24h window, derived
 *                      from real historical volume data when available
 */
export function computeScorecard(
  market: MarketData,
  dex: DexData,
  security: SecurityData,
  tokenAgeDays: number | undefined,
  volumeTrendPercent: number | undefined
): Scorecard {
  // --- Security ---
  let securityRow: ScorecardRow;
  if (!security.available) {
    securityRow = row("Security", "unknown", "Not Available");
  } else {
    const criticalIssues = [
      security.isHoneypot,
      security.isBlacklisted,
      security.canTakeBackOwnership,
      security.hasTradingRestrictions,
    ].filter(Boolean).length;
    const moderateIssues = [
      security.isMintable,
      !security.isOpenSource,
      (security.buyTax ?? 0) > 10,
      (security.sellTax ?? 0) > 10,
    ].filter(Boolean).length;

    if (criticalIssues > 0) securityRow = row("Security", "bad", "Critical Risk Detected");
    else if (moderateIssues > 0) securityRow = row("Security", "warn", "Some Concerns");
    else securityRow = row("Security", "good", "Strong");
  }

  // --- Liquidity ---
  const liq = dex.totalLiquidityUsd ?? 0;
  let liquidityRow: ScorecardRow;
  if (liq === 0) liquidityRow = row("Liquidity", "unknown", "Not Available");
  else if (liq >= 250_000) liquidityRow = row("Liquidity", "good", "Healthy");
  else if (liq >= 50_000) liquidityRow = row("Liquidity", "warn", "Moderate");
  else liquidityRow = row("Liquidity", "bad", "Thin");

  // --- Momentum ---
  const change24h = market.change24h ?? 0;
  const change7d = market.change7d ?? 0;
  const momentumScore = change24h * 0.6 + change7d * 0.4;
  let momentumRow: ScorecardRow;
  if (momentumScore > 5) momentumRow = row("Market Momentum", "good", "Bullish");
  else if (momentumScore > -5) momentumRow = row("Market Momentum", "warn", "Neutral");
  else momentumRow = row("Market Momentum", "bad", "Bearish");

  // --- Volume ---
  let volumeRow: ScorecardRow;
  if (volumeTrendPercent === undefined) {
    const turnover = market.marketCap ? (market.volume24h ?? 0) / market.marketCap : undefined;
    if (turnover === undefined) volumeRow = row("Trading Volume", "unknown", "Not Available");
    else if (turnover > 0.15) volumeRow = row("Trading Volume", "good", "Active");
    else if (turnover > 0.03) volumeRow = row("Trading Volume", "warn", "Moderate");
    else volumeRow = row("Trading Volume", "bad", "Low");
  } else if (volumeTrendPercent > 15) {
    volumeRow = row("Trading Volume", "good", "Increasing");
  } else if (volumeTrendPercent > -15) {
    volumeRow = row("Trading Volume", "warn", "Stable");
  } else {
    volumeRow = row("Trading Volume", "bad", "Declining");
  }

  // --- Holder Distribution ---
  let holderRow: ScorecardRow;
  if (security.top10HolderPercent === undefined) {
    holderRow = row("Holder Distribution", "unknown", "Not Available");
  } else if (security.top10HolderPercent < 30) {
    holderRow = row("Holder Distribution", "good", "Healthy Spread");
  } else if (security.top10HolderPercent < 60) {
    holderRow = row("Holder Distribution", "warn", "Moderate Risk");
  } else {
    holderRow = row("Holder Distribution", "bad", "High Concentration");
  }

  // --- Token Age ---
  let tokenAgeRow: ScorecardRow;
  if (tokenAgeDays === undefined) {
    tokenAgeRow = row("Token Age", "unknown", "Not Available");
  } else if (tokenAgeDays < 14) {
    tokenAgeRow = row("Token Age", "warn", "Newly Launched");
  } else if (tokenAgeDays < 180) {
    tokenAgeRow = row("Token Age", "warn", "Still Young");
  } else {
    tokenAgeRow = row("Token Age", "good", "Established");
  }

  // --- Volatility ---
  const absChange = Math.abs(change24h);
  let volatilityRow: ScorecardRow;
  if (absChange > 20) volatilityRow = row("Volatility", "bad", "High");
  else if (absChange > 8) volatilityRow = row("Volatility", "warn", "Moderate");
  else volatilityRow = row("Volatility", "good", "Low");

  const rows = [
    securityRow,
    liquidityRow,
    momentumRow,
    volumeRow,
    holderRow,
    tokenAgeRow,
    volatilityRow,
  ];

  // --- Overall score: weighted points per row, unknowns are excluded so
  // missing data doesn't unfairly drag the score down. ---
  const WEIGHTS: Record<string, number> = {
    Security: 25,
    Liquidity: 18,
    "Market Momentum": 15,
    "Trading Volume": 12,
    "Holder Distribution": 15,
    "Token Age": 7,
    Volatility: 8,
  };
  const STATUS_POINTS: Record<ScorecardRow["status"], number> = {
    good: 1,
    warn: 0.5,
    bad: 0,
    unknown: 0.6, // neutral-ish so a single missing data point doesn't tank the score
  };

  let weightedSum = 0;
  let weightTotal = 0;
  for (const r of rows) {
    const w = WEIGHTS[r.label] ?? 10;
    weightedSum += w * STATUS_POINTS[r.status];
    weightTotal += w;
  }
  const overallHealthScore = Math.round((weightedSum / weightTotal) * 100);

  // --- Explanation: name the strongest positive and negative drivers ---
  const positives = rows.filter((r) => r.status === "good").map((r) => r.label.toLowerCase());
  const negatives = rows
    .filter((r) => r.status === "bad" || r.status === "warn")
    .map((r) => r.label.toLowerCase());

  let overallExplanation: string;
  if (positives.length === 0 && negatives.length === 0) {
    overallExplanation = "Not enough data was available to fully explain this score.";
  } else {
    const posText = positives.length
      ? `driven by strong ${joinList(positives)}`
      : "not currently supported by any standout strengths";
    const negText = negatives.length
      ? `It is reduced by ${joinList(negatives)}.`
      : "No significant weaknesses were detected.";
    overallExplanation = `The score is ${posText}. ${negText}`;
  }

  return {
    security: securityRow,
    liquidity: liquidityRow,
    momentum: momentumRow,
    volume: volumeRow,
    holderDistribution: holderRow,
    tokenAge: tokenAgeRow,
    volatility: volatilityRow,
    overallHealthScore,
    overallExplanation,
  };
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Deterministic fallback for the Token Economy explanation (used if the AI call fails). */
export function fallbackTokenomicsExplanation(
  circulatingSupply: number | undefined,
  maxSupply: number | undefined
): string {
  if (!circulatingSupply || !maxSupply) {
    return "Full supply data wasn't available to calculate a circulating-to-max supply ratio for this token.";
  }
  const ratio = (circulatingSupply / maxSupply) * 100;
  if (ratio >= 90) {
    return `${ratio.toFixed(0)}% of the maximum supply is already circulating, so future dilution from new supply is likely limited.`;
  }
  if (ratio >= 50) {
    return `${ratio.toFixed(0)}% of the maximum supply is currently circulating, leaving a moderate amount of future supply still to enter the market.`;
  }
  return `Only ${ratio.toFixed(0)}% of the maximum supply is currently circulating, meaning significant future dilution is possible as more tokens unlock.`;
}

/** Deterministic fallback for the Market & Liquidity explanation (used if the AI call fails). */
export function fallbackMarketLiquidityExplanation(
  volume24h: number | undefined,
  marketCap: number | undefined,
  liquidityUsd: number | undefined
): string {
  const parts: string[] = [];
  if (volume24h && marketCap) {
    const turnover = (volume24h / marketCap) * 100;
    parts.push(
      turnover > 15
        ? `Daily trading volume equal to ${turnover.toFixed(0)}% of market cap suggests active trading interest.`
        : `Daily trading volume equal to ${turnover.toFixed(1)}% of market cap suggests relatively light trading interest.`
    );
  }
  if (liquidityUsd !== undefined) {
    parts.push(
      liquidityUsd > 250_000
        ? "Liquidity is deep enough to support orderly trading without excessive slippage."
        : "Liquidity is thin, which can mean higher slippage on larger trades."
    );
  }
  return parts.length > 0
    ? parts.join(" ")
    : "Market and liquidity data was too limited to explain in detail.";
}

/** Backward-compatible pair of scores derived from the scorecard, used for quick comparisons. */
export function scorecardToHealthScores(scorecard: Scorecard): HealthScores {
  return {
    healthScore: scorecard.overallHealthScore,
    riskScore: Math.max(0, Math.min(100, 100 - scorecard.overallHealthScore)),
  };
}

/**
 * Confidence Score reflects how complete and mutually consistent the
 * retrieved data is — NOT the AI's opinion of the token. It's computed
 * once here and simply handed to the LLM to *explain*; if the LLM's JSON
 * ever fails to parse, this number still renders correctly because it
 * never depended on the model's output in the first place.
 */
export function computeConfidenceScore(params: {
  priceSourceCount: number; // how many providers agreed on a price
  dexPairCount: number;
  securityAvailable: boolean;
  holderDataAvailable: boolean;
  volumeTrendAvailable: boolean;
  tokenAgeKnown: boolean;
  marketCapKnown: boolean;
}): number {
  let points = 0;
  const maxPoints = 100;

  points += Math.min(params.priceSourceCount, 2) * 15; // up to 30
  points += params.dexPairCount > 0 ? 15 : 0;
  points += params.securityAvailable ? 20 : 0;
  points += params.holderDataAvailable ? 15 : 0;
  points += params.volumeTrendAvailable ? 10 : 5; // turnover fallback still counts partially
  points += params.tokenAgeKnown ? 5 : 0;
  points += params.marketCapKnown ? 5 : 0;

  return Math.max(5, Math.min(maxPoints, Math.round(points)));
}

/** Deterministic fallback reasoning, used only if the LLM's own explanation is unavailable. */
export function deterministicConfidenceReasoning(params: {
  securityAvailable: boolean;
  holderDataAvailable: boolean;
  dexPairCount: number;
}): string {
  const solid: string[] = ["live price and market data"];
  const missing: string[] = [];

  if (params.securityAvailable) solid.push("contract security data");
  else missing.push("contract security data");

  if (params.holderDataAvailable) solid.push("holder distribution data");
  else missing.push("holder distribution data");

  if (params.dexPairCount > 0) solid.push("DEX liquidity data");
  else missing.push("DEX liquidity data");

  let text = `Confidence reflects the data sources available for this token: ${joinList(solid)} ${
    solid.length > 1 ? "were" : "was"
  } solid.`;
  if (missing.length > 0) {
    text += ` ${joinList(missing)} ${missing.length > 1 ? "were" : "was"} not available, which limits this analysis.`;
  }
  return text;
}
