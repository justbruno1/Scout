import { withCache } from "./cache";
import type { SecurityData } from "./types";

const BASE = "https://api.gopluslabs.io/api/v1";

/** GoPlus chain ids (numeric, EVM chain-id style; Solana handled separately). */
export const CHAIN_TO_GOPLUS_ID: Record<string, string> = {
  ethereum: "1",
  bnb: "56",
  bsc: "56",
  polygon: "137",
  arbitrum: "42161",
  avalanche: "43114",
  base: "8453",
};

function unavailable(): SecurityData {
  return { flags: [], available: false };
}

export async function getContractSecurity(
  chain: string,
  address: string
): Promise<SecurityData> {
  const chainId = CHAIN_TO_GOPLUS_ID[chain.toLowerCase()];
  if (!chainId) {
    // GoPlus's EVM token-security endpoint doesn't cover this chain
    // (e.g. Solana uses a separate endpoint / isn't fully supported here).
    return unavailable();
  }

  return withCache(`goplus:${chainId}:${address}`, 60_000, async () => {
    try {
      const res = await fetch(
        `${BASE}/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`,
        { headers: { accept: "application/json" }, next: { revalidate: 60 } }
      );
      if (!res.ok) return unavailable();

      const json = await res.json();
      const result = json?.result?.[address.toLowerCase()];
      if (!result) return unavailable();

      const flags: string[] = [];
      const isHoneypot = result.is_honeypot === "1";
      const isMintable = result.is_mintable === "1";
      const isOpenSource = result.is_open_source === "1";
      const isBlacklisted = result.is_blacklisted === "1";
      const canTakeBackOwnership = result.can_take_back_ownership === "1";
      const isProxy = result.is_proxy === "1";
      const buyTax = result.buy_tax ? parseFloat(result.buy_tax) * 100 : undefined;
      const sellTax = result.sell_tax ? parseFloat(result.sell_tax) * 100 : undefined;
      const holderCount = result.holder_count
        ? parseInt(result.holder_count, 10)
        : undefined;

      let top10HolderPercent: number | undefined;
      let largestHolderPercent: number | undefined;
      if (Array.isArray(result.holders)) {
        top10HolderPercent = result.holders
          .slice(0, 10)
          .reduce((sum: number, h: any) => sum + parseFloat(h.percent ?? "0") * 100, 0);
        largestHolderPercent = result.holders[0]
          ? parseFloat(result.holders[0].percent ?? "0") * 100
          : undefined;
      }

      const cannotBuy = result.cannot_buy === "1";
      const cannotSellAll = result.cannot_sell_all === "1";
      const tradingCooldown = result.trading_cooldown === "1";
      const hasTradingRestrictions = cannotBuy || cannotSellAll || tradingCooldown;

      let lockedLiquidity: "locked" | "unlocked" | "unknown" = "unknown";
      if (Array.isArray(result.lp_holders) && result.lp_holders.length > 0) {
        const lockedPercent = result.lp_holders
          .filter((h: any) => h.is_locked === 1 || h.is_locked === "1")
          .reduce((sum: number, h: any) => sum + parseFloat(h.percent ?? "0") * 100, 0);
        lockedLiquidity = lockedPercent >= 50 ? "locked" : "unlocked";
      }

      if (isHoneypot) flags.push("Honeypot detected — selling may be blocked");
      if (isMintable) flags.push("Owner can mint new tokens");
      if (!isOpenSource) flags.push("Contract source is not verified");
      if (isBlacklisted) flags.push("Contract can blacklist wallets");
      if (canTakeBackOwnership) flags.push("Ownership can be reclaimed by a hidden owner");
      if ((buyTax ?? 0) > 10) flags.push(`High buy tax (${buyTax?.toFixed(1)}%)`);
      if ((sellTax ?? 0) > 10) flags.push(`High sell tax (${sellTax?.toFixed(1)}%)`);
      if (top10HolderPercent && top10HolderPercent > 50)
        flags.push(`Top 10 holders control ${top10HolderPercent.toFixed(0)}% of supply`);
      if (hasTradingRestrictions) flags.push("Contract can restrict buying or selling");
      if (lockedLiquidity === "unlocked") flags.push("Liquidity does not appear to be locked");

      return {
        isHoneypot,
        isOpenSource,
        isMintable,
        ownerAddress: result.owner_address || undefined,
        isBlacklisted,
        buyTax,
        sellTax,
        canTakeBackOwnership,
        isProxy,
        hasTradingRestrictions,
        holderCount,
        largestHolderPercent,
        top10HolderPercent,
        lockedLiquidity,
        flags,
        available: true,
      };
    } catch {
      return unavailable();
    }
  });
}
