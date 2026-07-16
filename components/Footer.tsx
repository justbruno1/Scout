import { Github } from "lucide-react";
import { Logo } from "./Logo";

const PROVIDERS = [
  { name: "CoinGecko", url: "https://www.coingecko.com" },
  { name: "DexScreener", url: "https://dexscreener.com" },
  { name: "GeckoTerminal", url: "https://www.geckoterminal.com" },
  { name: "GoPlus", url: "https://gopluslabs.io" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-4xl px-6 py-10">
      <div className="divider mb-8" />
      <div className="flex flex-col items-center gap-6 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo size={18} />
          <span>Scout — an AI research analyst, not financial advice.</span>
        </div>

        <a
          href="https://github.com/justbruno1/Scout"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 transition-colors hover:text-text-primary"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>

        <span className="text-center sm:text-right">
          Data via{" "}
          {PROVIDERS.map((p, i) => (
            <span key={p.name}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                {p.name}
              </a>
              {i < PROVIDERS.length - 1 && ", "}
            </span>
          ))}
          .
        </span>
      </div>
    </footer>
  );
}
