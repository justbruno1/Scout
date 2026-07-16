export function formatUsd(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (value === 0) return "$0.00";
  if (Math.abs(value) < 0.01) return `$${value.toExponential(2)}`;
  if (Math.abs(value) >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(value < 1 ? 6 : 2)}`;
}

export function formatCompact(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(
    value
  );
}

export function formatPercent(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Maps a CoinGecko "platform" id to the chain names used across the app. */
export const CG_PLATFORM_TO_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  "binance-smart-chain": "bnb",
  base: "base",
  solana: "solana",
  "arbitrum-one": "arbitrum",
  avalanche: "avalanche",
  "polygon-pos": "polygon",
  sui: "sui",
};

export const SUPPORTED_CHAINS = [
  "Ethereum",
  "Base",
  "BNB",
  "Solana",
  "Arbitrum",
  "Avalanche",
  "Polygon",
  "Sui",
];

export function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function shortenAddress(address?: string): string {
  if (!address) return "—";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
