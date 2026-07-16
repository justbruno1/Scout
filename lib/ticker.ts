import { withCache } from "./cache";

const BASE = "https://api.coingecko.com/api/v3";

/** Fixed rotation list for the hero's live ticker, mapped to CoinGecko ids. */
export const TICKER_SYMBOLS: { symbol: string; id: string }[] = [
  { symbol: "BTC", id: "bitcoin" },
  { symbol: "ETH", id: "ethereum" },
  { symbol: "SOL", id: "solana" },
  { symbol: "PEPE", id: "pepe" },
  { symbol: "BONK", id: "bonk" },
  { symbol: "AERO", id: "aerodrome-finance" },
  { symbol: "ONDO", id: "ondo-finance" },
  { symbol: "MNT", id: "mantle" },
  { symbol: "DOGE", id: "dogecoin" },
  { symbol: "PENGU", id: "pudgy-penguins" },
  { symbol: "FARTCOIN", id: "fartcoin" },
];

export interface TickerReading {
  symbol: string;
  priceUsd?: number;
  change24h?: number;
}

export async function getTickerReadings(): Promise<TickerReading[]> {
  return withCache("ticker:live", 20_000, async () => {
    const ids = TICKER_SYMBOLS.map((t) => t.id).join(",");
    const res = await fetch(
      `${BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" }, next: { revalidate: 20 } }
    );
    if (!res.ok) throw new Error(`Ticker fetch failed: ${res.status}`);
    const data = await res.json();

    return TICKER_SYMBOLS.map(({ symbol, id }) => ({
      symbol,
      priceUsd: data[id]?.usd,
      change24h: data[id]?.usd_24h_change,
    })).filter((t) => t.priceUsd !== undefined);
  });
}
