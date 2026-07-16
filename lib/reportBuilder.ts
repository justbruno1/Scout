import {
  findByContract,
  getCoinDetail,
  getTopExchanges,
  getVolumeTrendPercent,
  searchCoins,
} from "./coingecko";
import { getPairsForToken, searchPairs, summarizePairs } from "./dexscreener";
import { getContractSecurity, CHAIN_TO_GOPLUS_ID } from "./goplus";
import { computeConfidenceScore, computeScorecard, scorecardToHealthScores } from "./scoring";
import { resolvePrice } from "./priceAggregator";
import { generateTokenReport } from "./ai";
import { CG_PLATFORM_TO_CHAIN } from "./utils";
import type { DexData, ExchangeListing, SecurityData, TokenReport } from "./types";

export class TokenNotFoundError extends Error {
  suggestions: { id: string; symbol: string; name: string }[];
  constructor(query: string, suggestions: { id: string; symbol: string; name: string }[] = []) {
    super(`Could not find a token matching "${query}"`);
    this.suggestions = suggestions;
  }
}

const CONTRACT_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$|^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Resolve any user input (ticker, name, or contract address) to a CoinGecko id. */
async function resolveCoinId(query: string): Promise<string> {
  const trimmed = query.trim();

  if (CONTRACT_ADDRESS_RE.test(trimmed)) {
    for (const platform of Object.keys(CG_PLATFORM_TO_CHAIN)) {
      const id = await findByContract(platform, trimmed);
      if (id) return id;
    }
  }

  const hits = await searchCoins(trimmed);
  if (hits.length === 0) {
    throw new TokenNotFoundError(query);
  }

  const lower = trimmed.toLowerCase();
  const exactSymbol = hits.find((h) => h.symbol.toLowerCase() === lower);
  const exactName = hits.find((h) => h.name.toLowerCase() === lower);
  const best = exactSymbol ?? exactName ?? hits[0];
  return best.id;
}

function daysSince(msOrIso: number | string | undefined): number | undefined {
  if (!msOrIso) return undefined;
  const t = typeof msOrIso === "string" ? Date.parse(msOrIso) : msOrIso;
  if (!t || Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}

const EMPTY_DEX: DexData = { pairs: [], primaryDexes: [], primaryChains: [], pairCount: 0 };
const EMPTY_SECURITY: SecurityData = { flags: [], available: false };

export async function buildTokenReport(query: string): Promise<TokenReport> {
  const partial: string[] = [];

  let coinId: string;
  try {
    coinId = await resolveCoinId(query);
  } catch (err) {
    if (err instanceof TokenNotFoundError) {
      try {
        const dexHits = await searchPairs(query);
        err.suggestions = dexHits
          .slice(0, 5)
          .map((p) => ({ id: p.pairAddress, symbol: p.baseSymbol, name: p.baseSymbol }));
      } catch {
        /* ignore */
      }
    }
    throw err;
  }

  const { identity, market } = await getCoinDetail(coinId);
  const chain = identity.chain ? CG_PLATFORM_TO_CHAIN[identity.chain] ?? identity.chain : undefined;

  // --- Everything below only depends on `identity`/`market`, so run it in
  // parallel rather than one await at a time. ---
  const [dexResult, securityResult, exchangesResult, volumeTrendResult] =
    await Promise.allSettled([
      chain && identity.contractAddress
        ? getPairsForToken(chain, identity.contractAddress)
        : searchPairs(identity.symbol).then(summarizePairs),
      chain && identity.contractAddress && CHAIN_TO_GOPLUS_ID[chain]
        ? getContractSecurity(chain, identity.contractAddress)
        : Promise.resolve(EMPTY_SECURITY),
      getTopExchanges(coinId),
      getVolumeTrendPercent(coinId),
    ]);

  const dex: DexData =
    dexResult.status === "fulfilled" ? dexResult.value : EMPTY_DEX;
  if (dex.pairs.length === 0) partial.push("dex");

  const security: SecurityData =
    securityResult.status === "fulfilled" ? securityResult.value : EMPTY_SECURITY;
  if (!security.available) partial.push("security");

  const topExchanges: ExchangeListing[] =
    exchangesResult.status === "fulfilled" ? exchangesResult.value : [];

  const volumeTrendPercent =
    volumeTrendResult.status === "fulfilled" ? volumeTrendResult.value : undefined;

  // --- Multi-source price resolution (needs `dex`, so runs after) ---
  let priceSourceCount = market.priceUsd !== undefined ? 1 : 0;
  try {
    const resolved = await resolvePrice(
      chain,
      identity.contractAddress,
      market.priceUsd,
      market.priceObservedAt,
      dex
    );
    if (resolved.priceUsd !== undefined) {
      market.priceUsd = resolved.priceUsd;
      market.priceSource = resolved.source;
      market.priceObservedAt = resolved.observedAt;
    }
    priceSourceCount = resolved.candidates.length;
  } catch {
    /* keep the CoinGecko price already on `market` */
  }

  // --- Token / pair age ---
  const tokenAgeDays = daysSince(identity.genesisDate) ?? daysSince(dex.oldestPairCreatedAt);
  const pairAgeDays = daysSince(dex.topPair?.pairCreatedAt);
  const launchDate = identity.genesisDate
    ? identity.genesisDate
    : dex.oldestPairCreatedAt
    ? new Date(dex.oldestPairCreatedAt).toISOString()
    : undefined;

  const scorecard = computeScorecard(market, dex, security, tokenAgeDays, volumeTrendPercent);
  const scores = scorecardToHealthScores(scorecard);

  const confidenceScore = computeConfidenceScore({
    priceSourceCount,
    dexPairCount: dex.pairCount,
    securityAvailable: security.available,
    holderDataAvailable: security.top10HolderPercent !== undefined,
    volumeTrendAvailable: volumeTrendPercent !== undefined,
    tokenAgeKnown: tokenAgeDays !== undefined,
    marketCapKnown: market.marketCap !== undefined,
  });

  // --- AI synthesis (confidence score is passed in, never computed by the model) ---
  const ai = await generateTokenReport(
    identity,
    market,
    dex,
    security,
    topExchanges,
    scorecard,
    confidenceScore,
    tokenAgeDays,
    pairAgeDays,
    launchDate,
    volumeTrendPercent
  );
  
  return {
    identity,
    market,
    dex,
    security,
    topExchanges,
    scores,
    scorecard,
    ai,
    confidenceScore,
    tokenAgeDays,
    pairAgeDays,
    launchDate,
    partial,
    generatedAt: Date.now(),
  };
}
