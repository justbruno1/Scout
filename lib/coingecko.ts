import { withCache } from "./cache";
import type { MarketData, TokenIdentity } from "./types";

const BASE = "https://api.coingecko.com/api/v3";

function authHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

async function cgFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json", ...authHeaders() },
    // CoinGecko's free tier is slow-changing; cache upstream too.
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko ${path} failed: ${res.status}`);
  }
  return res.json();
}

export interface CoinGeckoSearchHit {
  id: string;
  symbol: string;
  name: string;
  thumb?: string;
  large?: string;
  marketCapRank?: number;
}

/** Search CoinGecko by ticker, name, or partial query. */
export async function searchCoins(query: string): Promise<CoinGeckoSearchHit[]> {
  return withCache(`cg:search:${query.toLowerCase()}`, 60_000, async () => {
    const data = await cgFetch(`/search?query=${encodeURIComponent(query)}`);
    const coins = (data.coins ?? []) as any[];
    return coins.slice(0, 8).map((c) => ({
      id: c.id,
      symbol: (c.symbol ?? "").toUpperCase(),
      name: c.name,
      thumb: c.thumb,
      large: c.large,
      marketCapRank: c.market_cap_rank ?? undefined,
    }));
  });
}

/** Resolve a CoinGecko coin id from a contract address on a given platform. */
export async function findByContract(
  platform: string,
  address: string
): Promise<string | null> {
  try {
    const data = await cgFetch(
      `/coins/${platform}/contract/${address.toLowerCase()}`
    );
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export interface CoinGeckoFull {
  identity: TokenIdentity;
  market: MarketData;
}

/** Full coin detail: identity + market data, straight from /coins/{id}. */
export async function getCoinDetail(coinId: string): Promise<CoinGeckoFull> {
  return withCache(`cg:coin:${coinId}`, 30_000, async () => {
    const data = await cgFetch(
      `/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false&price_change_percentage=1h,24h,7d,30d`
    );

    const md = data.market_data ?? {};
    const platforms: Record<string, string> = data.platforms ?? {};
    const primaryPlatform = Object.keys(platforms).find((p) => platforms[p]);
    const categories: string[] = (data.categories ?? []).filter(Boolean);
    // Prefer a specific, descriptive category over generic ones like
    // "Cryptocurrency" when one is available.
    const genericCategories = new Set(["Cryptocurrency", "FTX Holdings"]);
    const category = categories.find((c) => !genericCategories.has(c)) ?? categories[0];

    const identity: TokenIdentity = {
      id: data.id,
      symbol: (data.symbol ?? "").toUpperCase(),
      name: data.name,
      logo: data.image?.large ?? data.image?.small,
      chain: primaryPlatform,
      contractAddress: primaryPlatform ? platforms[primaryPlatform] : undefined,
      genesisDate: data.genesis_date ?? undefined,
      category,
    };

    const lastUpdated = md.last_updated ? Date.parse(md.last_updated) : undefined;

    const market: MarketData = {
      priceUsd: md.current_price?.usd,
      priceSource: "CoinGecko",
      priceObservedAt: lastUpdated,
      change1h: md.price_change_percentage_1h_in_currency?.usd,
      change24h: md.price_change_percentage_24h,
      change7d: md.price_change_percentage_7d,
      change30d: md.price_change_percentage_30d_in_currency?.usd,
      marketCap: md.market_cap?.usd,
      marketCapRank: md.market_cap_rank,
      fdv: md.fully_diluted_valuation?.usd,
      volume24h: md.total_volume?.usd,
      circulatingSupply: md.circulating_supply,
      totalSupply: md.total_supply,
      maxSupply: md.max_supply ?? undefined,
      ath: md.ath?.usd,
      athDate: md.ath_date?.usd,
      atl: md.atl?.usd,
      atlDate: md.atl_date?.usd,
      categories,
    };

    return { identity, market };
  });
}

/**
 * Known DEX names (lowercased) so ticker market names can be split into
 * "Top Exchanges" (CEXs) vs. DEX venues for the DEX/CEX distribution view.
 */
const KNOWN_DEX_NAMES = new Set([
  "uniswap", "uniswap v2", "uniswap v3", "raydium", "orca", "pancakeswap",
  "pancakeswap v2", "pancakeswap v3", "sushiswap", "aerodrome", "jupiter",
  "curve", "balancer", "trader joe", "camelot", "meteora", "quickswap",
]);

export interface ExchangeHit {
  name: string;
  type: "cex" | "dex";
}

/** Top exchanges (by trust score/volume) a token trades on, from CoinGecko tickers. */
export async function getTopExchanges(coinId: string): Promise<ExchangeHit[]> {
  return withCache(`cg:exchanges:${coinId}`, 60_000, async () => {
    try {
      const data = await cgFetch(
        `/coins/${coinId}/tickers?include_exchange_logo=false&order=trust_score_desc`
      );
      const tickers: any[] = data.tickers ?? [];
      const seen = new Set<string>();
      const results: ExchangeHit[] = [];

      for (const t of tickers) {
        const name: string | undefined = t.market?.name;
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        results.push({
          name,
          type: KNOWN_DEX_NAMES.has(name.toLowerCase()) ? "dex" : "cex",
        });
        if (results.length >= 8) break;
      }
      return results;
    } catch {
      return [];
    }
  });
}

export async function getTrending(): Promise<
  { id: string; symbol: string; name: string; thumb: string }[]
> {
  return withCache("cg:trending", 120_000, async () => {
    const data = await cgFetch("/search/trending");
    return (data.coins ?? []).slice(0, 7).map((c: any) => ({
      id: c.item.id,
      symbol: (c.item.symbol ?? "").toUpperCase(),
      name: c.item.name,
      thumb: c.item.thumb,
    }));
  });
}

export async function getHistoricalPrices(
  coinId: string,
  days: number = 7
): Promise<{ t: number; price: number }[]> {
  return withCache(`cg:chart:${coinId}:${days}`, 60_000, async () => {
    const data = await cgFetch(
      `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    const prices: [number, number][] = data.prices ?? [];
    return prices.map(([t, price]) => ({ t, price }));
  });
}

/**
 * Fetches ~2 days of hourly volume history and compares the most recent 24h
 * window against the prior 24h window, so "trading volume is trending
 * upward/downward" is a real, measured percentage rather than a guess.
 */
export async function getVolumeTrendPercent(coinId: string): Promise<number | undefined> {
  return withCache(`cg:volume-trend:${coinId}`, 60_000, async () => {
    try {
      const data = await cgFetch(`/coins/${coinId}/market_chart?vs_currency=usd&days=2`);
      const volumes: [number, number][] = data.total_volumes ?? [];
      if (volumes.length < 4) return undefined;

      const now = volumes[volumes.length - 1][0];
      const dayMs = 24 * 60 * 60 * 1000;
      const recent = volumes.filter(([t]) => t >= now - dayMs);
      const prior = volumes.filter(([t]) => t < now - dayMs && t >= now - 2 * dayMs);
      if (recent.length === 0 || prior.length === 0) return undefined;

      const recentAvg = recent.reduce((s, [, v]) => s + v, 0) / recent.length;
      const priorAvg = prior.reduce((s, [, v]) => s + v, 0) / prior.length;
      if (priorAvg <= 0) return undefined;

      return ((recentAvg - priorAvg) / priorAvg) * 100;
    } catch {
      return undefined;
    }
  });
}
