import { withCache } from "./cache";
import type { DexData, DexPair } from "./types";

const BASE = "https://api.dexscreener.com";

async function dsFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`DexScreener ${path} failed: ${res.status}`);
  return res.json();
}

function mapPair(p: any): DexPair {
  return {
    dexId: p.dexId,
    chain: p.chainId,
    pairAddress: p.pairAddress,
    baseSymbol: p.baseToken?.symbol,
    quoteSymbol: p.quoteToken?.symbol,
    priceUsd: p.priceUsd ? Number(p.priceUsd) : undefined,
    liquidityUsd: p.liquidity?.usd,
    volume24h: p.volume?.h24,
    txns24h: p.txns?.h24
      ? { buys: p.txns.h24.buys ?? 0, sells: p.txns.h24.sells ?? 0 }
      : undefined,
    pairCreatedAt: p.pairCreatedAt,
    url: p.url,
  };
}

/** Search DexScreener by ticker/name/contract; returns ranked pairs. */
export async function searchPairs(query: string): Promise<DexPair[]> {
  return withCache(`ds:search:${query.toLowerCase()}`, 20_000, async () => {
    const data = await dsFetch(`/latest/dex/search?q=${encodeURIComponent(query)}`);
    const pairs: any[] = data.pairs ?? [];
    return pairs
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
      .slice(0, 10)
      .map(mapPair);
  });
}

export function summarizePairs(pairs: DexPair[]): DexData {
  const totalLiquidityUsd = pairs.reduce((sum, p) => sum + (p.liquidityUsd ?? 0), 0);
  const primaryDexes = Array.from(new Set(pairs.map((p) => p.dexId).filter(Boolean))).slice(0, 6);
  const primaryChains = Array.from(new Set(pairs.map((p) => p.chain).filter(Boolean))).slice(0, 6);
  const createdTimestamps = pairs
    .map((p) => p.pairCreatedAt)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const oldestPairCreatedAt = createdTimestamps.length
    ? Math.min(...createdTimestamps)
    : undefined;

  return {
    pairs,
    totalLiquidityUsd,
    topPair: pairs[0],
    primaryDexes,
    primaryChains,
    pairCount: pairs.length,
    oldestPairCreatedAt,
  };
}

/** Get all pairs for a specific token contract on a specific chain. */
export async function getPairsForToken(
  chain: string,
  tokenAddress: string
): Promise<DexData> {
  return withCache(`ds:token:${chain}:${tokenAddress}`, 20_000, async () => {
    const data = await dsFetch(`/tokens/v1/${chain}/${tokenAddress}`);
    const raw: any[] = Array.isArray(data) ? data : [];
    const pairs = raw.map(mapPair).sort(
      (a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0)
    );
    return summarizePairs(pairs);
  });
}

export async function getNewTokenProfiles(): Promise<any[]> {
  return withCache("ds:new-profiles", 60_000, async () => {
    const data = await dsFetch(`/token-profiles/latest/v1`);
    return Array.isArray(data) ? data.slice(0, 10) : [];
  });
}
