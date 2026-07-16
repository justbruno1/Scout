import { withCache } from "./cache";

const BASE = "https://api.geckoterminal.com/api/v2";

async function gtFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json;version=20230302" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`GeckoTerminal ${path} failed: ${res.status}`);
  return res.json();
}

export interface PoolSummary {
  address: string;
  name: string;
  dex?: string;
  baseTokenPriceUsd?: number;
  volume24h?: number;
  reserveUsd?: number;
  priceChange24h?: number;
}

/**
 * GeckoTerminal network ids differ slightly from DexScreener chain ids
 * (e.g. "bsc" instead of "bnb", "avax" instead of "avalanche").
 */
export const CHAIN_TO_GECKOTERMINAL_NETWORK: Record<string, string> = {
  ethereum: "eth",
  bnb: "bsc",
  bsc: "bsc",
  base: "base",
  solana: "solana",
  arbitrum: "arbitrum",
  avalanche: "avax",
  polygon: "polygon_pos",
  sui: "sui-network",
};

export async function getPoolsForToken(
  network: string,
  tokenAddress: string
): Promise<PoolSummary[]> {
  return withCache(`gt:pools:${network}:${tokenAddress}`, 30_000, async () => {
    const data = await gtFetch(
      `/networks/${network}/tokens/${tokenAddress}/pools?page=1`
    );
    const pools: any[] = data.data ?? [];
    return pools.slice(0, 10).map((p) => ({
      address: p.attributes?.address,
      name: p.attributes?.name,
      dex: p.relationships?.dex?.data?.id,
      baseTokenPriceUsd: p.attributes?.base_token_price_usd
        ? Number(p.attributes.base_token_price_usd)
        : undefined,
      volume24h: p.attributes?.volume_usd?.h24
        ? Number(p.attributes.volume_usd.h24)
        : undefined,
      reserveUsd: p.attributes?.reserve_in_usd
        ? Number(p.attributes.reserve_in_usd)
        : undefined,
      priceChange24h: p.attributes?.price_change_percentage?.h24
        ? Number(p.attributes.price_change_percentage.h24)
        : undefined,
    }));
  });
}
