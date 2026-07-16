import { NextRequest, NextResponse } from "next/server";
import { getCoinDetail } from "@/lib/coingecko";
import { getPairsForToken } from "@/lib/dexscreener";
import { resolvePrice } from "@/lib/priceAggregator";
import { CG_PLATFORM_TO_CHAIN } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const coinId = req.nextUrl.searchParams.get("id");
  if (!coinId) {
    return NextResponse.json({ error: "Missing query parameter 'id'" }, { status: 400 });
  }

  try {
    const { identity, market } = await getCoinDetail(coinId);
    const chain = identity.chain ? CG_PLATFORM_TO_CHAIN[identity.chain] ?? identity.chain : undefined;

    let dex;
    try {
      dex =
        chain && identity.contractAddress
          ? await getPairsForToken(chain, identity.contractAddress)
          : { pairs: [], primaryDexes: [], primaryChains: [], pairCount: 0 };
    } catch {
      dex = { pairs: [], primaryDexes: [], primaryChains: [], pairCount: 0 };
    }

    const resolved = await resolvePrice(
      chain,
      identity.contractAddress,
      market.priceUsd,
      market.priceObservedAt,
      dex as any
    );

    return NextResponse.json({
      priceUsd: resolved.priceUsd ?? market.priceUsd,
      source: resolved.source ?? market.priceSource,
      observedAt: resolved.observedAt ?? market.priceObservedAt ?? Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Price refresh failed" }, { status: 500 });
  }
}
