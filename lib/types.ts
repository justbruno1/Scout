// Core data contracts for Scout. Every field here is meant to be filled
// from a real API response — never fabricated. Fields are optional where
// a data source might not return them so the UI can render partial data
// gracefully instead of crashing.

export interface TokenIdentity {
  id: string; // coingecko id, e.g. "pepe"
  symbol: string; // "PEPE"
  name: string; // "Pepe"
  logo?: string;
  chain?: string;
  contractAddress?: string;
  genesisDate?: string; // ISO date, from CoinGecko when available
  category?: string; // first meaningful CoinGecko category, e.g. "Meme", "RWA"
}

/** A single price reading from one provider, used for freshness comparison. */
export interface PriceSource {
  source: "CoinGecko" | "DexScreener" | "GeckoTerminal";
  priceUsd: number;
  observedAt: number; // unix ms — when this reading was considered "as of"
}

/** The winning price after comparing freshness/validity across providers. */
export interface ResolvedPrice {
  priceUsd?: number;
  source?: string;
  observedAt?: number;
  candidates: PriceSource[]; // every provider reading that was compared
}

export interface MarketData {
  priceUsd?: number;
  priceSource?: string;
  priceObservedAt?: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
  marketCap?: number;
  marketCapRank?: number;
  fdv?: number;
  volume24h?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  ath?: number;
  athDate?: string;
  atl?: number;
  atlDate?: string;
  categories?: string[];
}

export interface DexPair {
  dexId: string;
  chain: string;
  pairAddress: string;
  baseSymbol: string;
  quoteSymbol: string;
  priceUsd?: number;
  liquidityUsd?: number;
  volume24h?: number;
  txns24h?: { buys: number; sells: number };
  pairCreatedAt?: number;
  url?: string;
}

export interface DexData {
  pairs: DexPair[];
  totalLiquidityUsd?: number;
  topPair?: DexPair;
  primaryDexes: string[]; // e.g. ["Uniswap", "Raydium"]
  primaryChains: string[]; // e.g. ["ethereum", "base"]
  pairCount: number;
  oldestPairCreatedAt?: number; // used as a token-age proxy when genesisDate is missing
}

export interface ExchangeListing {
  name: string;
  type: "cex" | "dex";
}

export interface SecurityData {
  isHoneypot?: boolean;
  isOpenSource?: boolean;
  isMintable?: boolean;
  ownerAddress?: string;
  isBlacklisted?: boolean;
  buyTax?: number;
  sellTax?: number;
  canTakeBackOwnership?: boolean;
  isProxy?: boolean;
  hasTradingRestrictions?: boolean;
  holderCount?: number;
  largestHolderPercent?: number;
  top10HolderPercent?: number;
  lockedLiquidity?: "locked" | "unlocked" | "unknown";
  flags: string[]; // human-readable risk flags
  available: boolean; // false if GoPlus had no data for this chain/contract
}

export type ScorecardStatus = "good" | "warn" | "bad" | "unknown";

export interface ScorecardRow {
  label: string;
  status: ScorecardStatus;
  detail: string; // short human-readable status, e.g. "Bullish", "Newly Launched"
}

export interface Scorecard {
  security: ScorecardRow;
  liquidity: ScorecardRow;
  momentum: ScorecardRow;
  volume: ScorecardRow;
  holderDistribution: ScorecardRow;
  tokenAge: ScorecardRow;
  volatility: ScorecardRow;
  overallHealthScore: number; // 0-100, deterministic
  overallExplanation: string; // deterministic, template-built from the row statuses
}

/** Retained for the deterministic risk gauge shown alongside the scorecard. */
export interface HealthScores {
  healthScore: number;
  riskScore: number;
}

export interface AIReport {
  overview: string;
  marketActivitySummary: string;
  tokenomicsExplanation: string; // plain-language read of the supply ratio
  marketLiquidityExplanation: string; // plain-language read of market/liquidity numbers
  investmentThesis: string; // unique per token, never a fixed label
  supportingReasons: string[]; // 3-6, evidence-based
  keyRisks: string[];
  outlookPositive: string[]; // what would strengthen the case
  outlookNegative: string[]; // what would weaken the case
  analystVerdict: string; // short concluding summary shown in its own box
  confidenceReasoning: string; // explains the deterministic confidenceScore below
}

export interface TokenReport {
  identity: TokenIdentity;
  market: MarketData;
  dex: DexData;
  security: SecurityData;
  topExchanges: ExchangeListing[];
  scores: HealthScores;
  scorecard: Scorecard;
  ai: AIReport;
  confidenceScore: number; // 0-100, computed deterministically — never guessed by the LLM
  tokenAgeDays?: number;
  pairAgeDays?: number;
  launchDate?: string; // ISO date used for display
  partial: string[]; // list of sections that failed to load
  generatedAt: number;
}

export interface ComparisonResult {
  tokens: TokenReport[];
  aiConclusion: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
