import type { DexData, PriceSource, ResolvedPrice } from "./types";
import { getPoolsForToken, CHAIN_TO_GECKOTERMINAL_NETWORK } from "./geckoterminal";

/**
 * DexScreener and GeckoTerminal responses don't carry an explicit "as of"
 * timestamp for the price itself — but because we fetch them live on every
 * request, we treat that fetch moment as their observation time. CoinGecko
 * does carry a real `last_updated` timestamp on its market_data, which can
 * lag behind by anywhere from a few seconds to a couple of minutes on the
 * free tier. Whichever reading is closest to "now" wins.
 */
export async function resolvePrice(
  chain: string | undefined,
  contractAddress: string | undefined,
  cgPriceUsd: number | undefined,
  cgObservedAt: number | undefined,
  dex: DexData
): Promise<ResolvedPrice> {
  const candidates: PriceSource[] = [];
  const now = Date.now();

  if (cgPriceUsd !== undefined && cgPriceUsd > 0) {
    candidates.push({
      source: "CoinGecko",
      priceUsd: cgPriceUsd,
      observedAt: cgObservedAt ?? now,
    });
  }

  if (dex.topPair?.priceUsd !== undefined && dex.topPair.priceUsd > 0) {
    candidates.push({
      source: "DexScreener",
      priceUsd: dex.topPair.priceUsd,
      observedAt: now,
    });
  }

  if (chain && contractAddress) {
    const network = CHAIN_TO_GECKOTERMINAL_NETWORK[chain.toLowerCase()];
    if (network) {
      try {
        const pools = await getPoolsForToken(network, contractAddress);
        const best = pools.find((p) => p.baseTokenPriceUsd && p.baseTokenPriceUsd > 0);
        if (best?.baseTokenPriceUsd) {
          candidates.push({
            source: "GeckoTerminal",
            priceUsd: best.baseTokenPriceUsd,
            observedAt: now,
          });
        }
      } catch {
        /* GeckoTerminal is optional — ignore failures */
      }
    }
  }

  if (candidates.length === 0) {
    return { candidates: [] };
  }

  const freshest = candidates.reduce((a, b) => (b.observedAt > a.observedAt ? b : a));

  return {
    priceUsd: freshest.priceUsd,
    source: freshest.source,
    observedAt: freshest.observedAt,
    candidates,
  };
}
