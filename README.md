# Scout

Scout is an AI research analyst for crypto tokens. It combines real-time
market data, DEX liquidity, contract security, and tokenomics into a
single report — generated in under 30 seconds — and explained in plain
language by an LLM that is only ever allowed to *explain* the numbers, never
invent them.

Scout is not a trading bot. Scout is not a chatbot. It's a research tool.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** for styling, **Framer Motion** for animation
- **TanStack Query** + **Zustand** for client-side data/state
- **Geist** font family (with Inter as fallback)
- All data comes from real, free APIs — nothing is mocked or hardcoded

## Data sources

| Source | Used for |
|---|---|
| [CoinGecko](https://www.coingecko.com/en/api) | Price, market cap, volume, FDV, metadata, search, historical prices |
| [DexScreener](https://docs.dexscreener.com/api/reference) | Liquidity, trading pairs, DEX volume, pair info |
| [GeckoTerminal](https://www.geckoterminal.com/dex-api) | Multi-chain DEX pool analytics |
| [GoPlus Security](https://docs.gopluslabs.io/) | Honeypot detection, mint function, ownership, blacklist, tax |
| **Gemini 2.5 Flash** | Primary LLM — synthesizes the above into the report |
| **Groq** (Llama 3.3 70B) | Automatic fallback if Gemini is unavailable |

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in GEMINI_API_KEY (required) and GROQ_API_KEY (recommended fallback)
npm run dev
```

Open http://localhost:3000.

### Required keys

- **`GEMINI_API_KEY`** — free at [Google AI Studio](https://aistudio.google.com/apikey). Without this (and without Groq configured) Scout will still show all live market/security/community data, but the AI-written sections will show a "temporarily unavailable" message instead of crashing.
- **`GROQ_API_KEY`** — free at [console.groq.com](https://console.groq.com/keys). Used only if Gemini fails or isn't configured.

Everything else in `.env.example` is optional and only improves rate limits.

## Project structure

```
app/
  page.tsx                 landing page (hero, chains, features)
  analyze/page.tsx         single-token report page
  compare/page.tsx         side-by-side comparison page
  api/
    analyze/route.ts       aggregates all data sources + AI report for one token
    compare/route.ts       same, for 2-4 tokens + AI comparison conclusion
    chat/route.ts          follow-up Q&A grounded in the generated report
    search/route.ts        live search suggestions + natural-language intent detection
components/                UI building blocks (Mascot, SearchBar, ReportView, ...)
lib/
  coingecko.ts, dexscreener.ts, geckoterminal.ts, goplus.ts, ticker.ts, priceAggregator.ts
  ai.ts                    Gemini/Groq calls + prompt engineering
  scoring.ts               deterministic health/risk scoring (not AI-guessed)
  reportBuilder.ts         orchestrates all sources into one TokenReport
  cache.ts                 short-TTL in-memory cache to respect free-tier limits
store/useScoutStore.ts     zustand store (recent searches, per-token chat history)
```

## Design principles baked into the code

- **No mock data, ever.** Every number in a report traces back to a real API
  response. If a source fails, that section is marked "temporarily
  unavailable" — the app never fabricates numbers or crashes.
- **No fixed recommendation labels.** Scout never outputs "Watch / Buy / Sell
  / Hold". Instead every report gets a unique, evidence-grounded **Investment
  Thesis**, **Supporting Evidence** tied to real metrics, **Key Risks**, and
  a **"What Would Change This Outlook?"** section.
- **Confidence is deterministic.** `lib/scoring.ts`'s `computeConfidenceScore`
  derives the score from real data completeness (how many price sources
  agreed, whether security/holder/liquidity data was available) — the LLM
  is only ever handed that number to *explain*, never to invent. If the AI
  call fails twice in a row, a deterministic fallback explanation is used
  instead of surfacing any internal error to the user.
- **The Decision Scorecard is deterministic.** All seven rows (Security,
  Liquidity, Momentum, Volume, Holder Distribution, Token Age, Volatility)
  plus the Overall Health Score are computed in `lib/scoring.ts` from real
  metrics — the AI only ever *references* this scorecard.
- **Multi-source price resolution.** `lib/priceAggregator.ts` compares price
  readings from CoinGecko, DexScreener, and GeckoTerminal and picks the
  freshest one, then shows its source and "updated Ns ago" — refreshed on
  every analysis and polled every 20s while the report page stays open.
- **Graceful degradation everywhere.** Every external call is wrapped so a
  single failing API (rate limit, downtime) degrades one section of the
  report instead of the whole page.

## What's in this version

- **Branding**: the official Scout "S" mark appears in the navbar, footer,
  loading screen, browser tab (favicon), and Open Graph image
  (`app/icon.png`, `app/apple-icon.png`, `public/og-image.png`,
  `components/Logo.tsx`).
- **Hero**: a small, subtle, slowly-rotating neon-green CSS 3D dot sphere
  (`components/NeuralSphere.tsx`) replaces the old mascot dot, a live
  rotating price ticker sits above the search box (`components/LiveTicker.tsx`
  + `app/api/ticker/route.ts`), and an infinite marquee of data sources sits
  below it (`components/Marquee.tsx`).
- **Navbar**: sticky, glass-blurs on scroll, smooth-scrolls to `#how-it-works`
  and `#features` (`components/Navbar.tsx`).
- **Landing sections**: `SupportsRow` (replaces the old chains list),
  `HowItWorks` (alternating 4-step layout), a trimmed 4-item `Features`
  section (Reddit/"Social Intelligence" removed entirely).
- **Report order** (`components/ReportView.tsx`): Live Price & Performance →
  Asset Overview → Token Economy → Market & Liquidity Overview → Security
  Analysis (PASS/WARNING/FAIL) → Holder Distribution → Decision Scorecard →
  Investment Thesis → Supporting Evidence → Key Risks → What Would Change
  This Outlook? → Confidence Score.
- **Motion polish**: shared easing in `lib/motion.ts`, animated count-up
  numbers (`components/CountUp.tsx`), expandable/collapsible long text
  (`components/ExpandableText.tsx`).

One honest caveat: a few "nice to have" fields (burned supply, inflation
rate, exact liquidity-lock provider/duration, holder growth trend) aren't
reliably exposed by any free-tier API, so those show "Not Available" rather
than being guessed.

## Extending Scout

The architecture is intentionally left open for:

- **Auth + saved watchlists** — add Supabase auth and a `watchlists` table;
  the Zustand store's shape already separates "recent queries" from
  potential persisted state.
- **Alerts / portfolios** — `lib/reportBuilder.ts` is the single choke point
  for "give me everything about token X"; a cron job or webhook can reuse it
  directly.
- **Wallet analysis** — add a new `lib/wallet.ts` source following the same
  pattern as the existing clients (fetch → cache → typed return).
- **Premium tiers** — API routes are already isolated per feature, so gating
  by plan is a matter of adding a check at the top of each route handler.

## Deploying

Ready for Vercel: `vercel deploy`, then set the same environment variables
from `.env.example` in the Vercel project settings.
