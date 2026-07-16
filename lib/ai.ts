import type {
  AIReport,
  ChatMessage,
  DexData,
  ExchangeListing,
  MarketData,
  Scorecard,
  SecurityData,
  TokenIdentity,
} from "./types";
import {
  fallbackMarketLiquidityExplanation,
  fallbackTokenomicsExplanation,
  deterministicConfidenceReasoning,
} from "./scoring";

export const SYSTEM_PROMPT = `You are Scout, an experienced crypto research analyst specializing in digital assets across meme coins, AI tokens, DeFi, RWA, infrastructure, gaming, and Layer 1/Layer 2 ecosystems. You behave like a professional human analyst writing a research note — not a chatbot, and not a template generator. Never fabricate prices, metrics, sentiment, or security findings. Every conclusion must be supported by the provided evidence.

Do not default to generic recommendations such as "Watch," "Buy," "Sell," or "Hold." Instead, every investment thesis you write must naturally cover, in flowing prose (not labeled sub-sections):
1. What the token is and which sector/category it belongs to.
2. Its current market position and ecosystem relevance (exchange listings, chain, market cap standing).
3. The strongest positive signals actually supported by the retrieved data.
4. The main risks or weaknesses actually supported by the retrieved data.
5. What future developments would strengthen or weaken the outlook.
6. A concluding investment opinion written in natural language — never a single-word label.

Every thesis must be grounded in that specific token's own numbers and character. Two different tokens should never read like the same template with different numbers swapped in — vary your structure, emphasis, and phrasing token to token, the way a real analyst's tone shifts between covering a blue-chip Layer 1, a meme coin, and an RWA protocol. Your goal is not to predict the future, but to help users make informed decisions based on current data.`;

// investmentThesis and analystVerdict are listed FIRST so that if the model's
// response is ever truncated mid-generation, the most important content has
// already been written and can still be recovered even from a broken tail.
const REPORT_JSON_INSTRUCTIONS = `A confidence score has ALREADY been computed for you deterministically from real data completeness — you do not need to calculate or output a confidenceScore. Respond with ONLY a raw JSON object (no markdown fences, no preamble, no text before or after the JSON) matching exactly this shape, with fields in this exact order:
{
  "investmentThesis": string (4-7 sentences of flowing analyst prose covering: what the token is and its sector, its market/ecosystem position, the strongest data-backed positive signals, the main data-backed risks, and a natural-language concluding opinion. Never a "Buy/Sell/Hold/Watch" label. This must read uniquely for this specific token — do not reuse generic template phrasing you might use for a different token),
  "analystVerdict": string (1-2 sentences: a short, concrete closing verdict summarizing the thesis, written like the last line of a research note, e.g. "ONDO shows stronger-than-average fundamentals within the RWA sector, but current momentum is neutral."),
  "overview": string (2-4 sentences, plain-language summary of what this token is, its category, and its current state),
  "marketActivitySummary": string (2-3 sentences on volume/liquidity/momentum trends, only using given data),
  "tokenomicsExplanation": string (1-2 sentences explaining what the circulating-to-max-supply ratio means for future dilution risk — reference the actual ratio given),
  "marketLiquidityExplanation": string (1-2 sentences explaining why the given market cap, liquidity, and volume numbers matter for this token),
  "supportingReasons": string[] (3-6 short bullets, each referencing a SPECIFIC metric you were given, e.g. "Liquidity of $410K across 3 pairs supports orderly trading" — never invent a number that wasn't provided),
  "keyRisks": string[] (2-5 short bullets naming the biggest concrete risks given the data, e.g. holder concentration, token age, low liquidity, security flags),
  "outlookPositive": string[] (2-4 short bullets: concrete future developments that would STRENGTHEN the case),
  "outlookNegative": string[] (2-4 short bullets: concrete future developments that would WEAKEN the case),
  "confidenceReasoning": string (1-2 sentences explaining what the ALREADY-COMPUTED confidence score reflects, referencing which data was solid vs missing — do not invent a different number, just explain the one you were given)
}`;

function buildDataBlock(
  identity: TokenIdentity,
  market: MarketData,
  dex: DexData,
  security: SecurityData,
  topExchanges: ExchangeListing[],
  scorecard: Scorecard,
  confidenceScore: number,
  tokenAgeDays: number | undefined,
  pairAgeDays: number | undefined,
  launchDate: string | undefined,
  volumeTrendPercent: number | undefined
) {
  return JSON.stringify(
    {
      tokenIdentity: identity,
      marketData: market,
      launchAndAge: { launchDate, tokenAgeDays, pairAgeDays },
      dexAndLiquidityData: dex,
      topExchanges,
      contractSecurity: security.available
        ? security
        : { available: false, note: "Security data unavailable for this chain/contract" },
      decisionScorecard: scorecard,
      volumeTrendPercent,
      alreadyComputedConfidenceScore: confidenceScore,
    },
    null,
    0
  );
}

type LLMOptions = { json?: boolean };

async function callGemini(
  messages: { role: string; content: string }[],
  options: LLMOptions = {}
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages.filter((m) => m.role !== "system");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: rest.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        // Generous output budget so a long, unique research-note thesis is
        // never silently truncated mid-JSON (which used to look identical
        // to "the AI failed" and triggered the placeholder every time).
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 3072,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) {
    const reason = candidate?.finishReason ?? "unknown";
    throw new Error(`Gemini returned empty response (finishReason: ${reason})`);
  }
  return text;
}

async function callGroq(
  messages: { role: string; content: string }[],
  options: LLMOptions = {}
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.6,
      max_tokens: 2048,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq returned empty response");
  return text;
}

/** Calls Gemini first, falls back to Groq if Gemini fails or is unconfigured. */
async function callLLM(
  messages: { role: string; content: string }[],
  options: LLMOptions = {}
): Promise<string> {
  try {
    return await callGemini(messages, options);
  } catch (geminiErr) {
    try {
      return await callGroq(messages, options);
    } catch (groqErr) {
      throw new Error(
        `Both AI providers failed. Gemini: ${(geminiErr as Error).message}. Groq: ${(groqErr as Error).message}`
      );
    }
  }
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/** Grabs the substring from the first '{' to the last '}' so any stray preamble/postamble text the model adds doesn't break JSON.parse. */
function extractJsonSubstring(text: string): string {
  const cleaned = stripJsonFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

/**
 * Pulls a single string field directly out of raw (possibly broken or
 * truncated) JSON text via regex. This is what lets Scout recover a real,
 * unique thesis even when the model's JSON got cut off or malformed —
 * instead of discarding a perfectly good answer and showing a placeholder.
 */
function extractStringField(raw: string, field: string): string | undefined {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s");
  const match = raw.match(re);
  if (!match) return undefined;
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
}
function extractStringArrayField(raw: string, field: string): string[] {
  const re = new RegExp(`"${field}"\\s*:\\s*\\[((?:\\\\.|[^\\]\\\\])*)\\]`, "s");
  const match = raw.match(re);
  if (!match) return [];
  try {
    const parsed = JSON.parse(`[${match[1]}]`);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type ParsedAIReport = Omit<AIReport, "confidenceReasoning"> & { confidenceReasoning?: string };

/** Attempt 1: clean, valid JSON. */
function parseReportStrict(raw: string): ParsedAIReport | null {
  try {
    const parsed = JSON.parse(extractJsonSubstring(raw));
    if (typeof parsed.investmentThesis !== "string" || parsed.investmentThesis.trim().length < 30) {
      return null;
    }
    return {
      investmentThesis: parsed.investmentThesis,
      analystVerdict: parsed.analystVerdict ?? "",
      overview: parsed.overview ?? "",
      marketActivitySummary: parsed.marketActivitySummary ?? "",
      tokenomicsExplanation: parsed.tokenomicsExplanation ?? "",
      marketLiquidityExplanation: parsed.marketLiquidityExplanation ?? "",
      supportingReasons: Array.isArray(parsed.supportingReasons) ? parsed.supportingReasons : [],
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
      outlookPositive: Array.isArray(parsed.outlookPositive) ? parsed.outlookPositive : [],
      outlookNegative: Array.isArray(parsed.outlookNegative) ? parsed.outlookNegative : [],
      confidenceReasoning: parsed.confidenceReasoning,
    };
  } catch {
    return null;
  }
}

/** Attempt 2: the JSON was broken/truncated, but pull out the real fields we can with regex. */
function parseReportRecovered(raw: string): ParsedAIReport | null {
  const investmentThesis = extractStringField(raw, "investmentThesis");
  if (!investmentThesis || investmentThesis.trim().length < 30) return null;

  return {
    investmentThesis,
    analystVerdict: extractStringField(raw, "analystVerdict") ?? "",
    overview: extractStringField(raw, "overview") ?? "",
    marketActivitySummary: extractStringField(raw, "marketActivitySummary") ?? "",
    tokenomicsExplanation: extractStringField(raw, "tokenomicsExplanation") ?? "",
    marketLiquidityExplanation: extractStringField(raw, "marketLiquidityExplanation") ?? "",
    supportingReasons: extractStringArrayField(raw, "supportingReasons"),
    keyRisks: extractStringArrayField(raw, "keyRisks"),
    outlookPositive: extractStringArrayField(raw, "outlookPositive"),
    outlookNegative: extractStringArrayField(raw, "outlookNegative"),
    confidenceReasoning: extractStringField(raw, "confidenceReasoning"),
  };
}

function parseReport(raw: string): ParsedAIReport | null {
  return parseReportStrict(raw) ?? parseReportRecovered(raw);
}

function formatUsd(value: number | undefined): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function formatPercent(value: number | undefined): string | undefined {
  return value === undefined || !Number.isFinite(value) ? undefined : `${value.toFixed(1)}%`;
}

/** A data-only safety net for provider outages; never return a fixed apology as a thesis. */
function buildEvidenceBasedFallback(
  identity: TokenIdentity,
  market: MarketData,
  dex: DexData,
  security: SecurityData,
  topExchanges: ExchangeListing[],
  launchDate: string | undefined
): Pick<
  AIReport,
  "investmentThesis" | "analystVerdict" | "overview" | "supportingReasons" | "keyRisks" | "outlookPositive" | "outlookNegative"
> {
  const sector = identity.category ?? market.categories?.[0] ?? "digital asset";
  const position = [
    market.marketCapRank ? `market-cap rank #${market.marketCapRank}` : undefined,
    formatUsd(market.marketCap) ? `market cap of ${formatUsd(market.marketCap)}` : undefined,
    identity.chain ? `presence on ${identity.chain}` : undefined,
  ].filter((item): item is string => Boolean(item));
  const liquidity = formatUsd(dex.totalLiquidityUsd);
  const volume = formatUsd(market.volume24h);
  const performance = formatPercent(market.change24h);
  const exchanges = topExchanges.slice(0, 3).map((exchange) => exchange.name);
  const securitySignals = security.available
    ? [
        security.isHoneypot === false ? "no honeypot flag" : undefined,
        security.isMintable === false ? "no unrestricted mint flag" : undefined,
        security.isOpenSource ? "verified source code" : undefined,
      ].filter((item): item is string => Boolean(item))
    : [];
  const risks = [
    ...security.flags,
    security.top10HolderPercent !== undefined
      ? `top 10 holders control ${security.top10HolderPercent.toFixed(1)}% of supply`
      : undefined,
    security.isMintable ? "the contract reports a mint function" : undefined,
    security.isProxy ? "the contract is upgradeable through a proxy" : undefined,
    liquidity ? undefined : "DEX liquidity data is unavailable",
  ].filter((item): item is string => Boolean(item));
  const support = [
    liquidity ? `${liquidity} of tracked DEX liquidity across ${dex.pairCount} pair${dex.pairCount === 1 ? "" : "s"}` : undefined,
    volume ? `${volume} of 24-hour trading volume` : undefined,
    exchanges.length ? `listed on ${exchanges.join(", ")}` : undefined,
    securitySignals.length ? `security checks show ${securitySignals.join(", ")}` : undefined,
    launchDate ? `launch data is available from ${new Date(launchDate).toLocaleDateString()}` : undefined,
  ].filter((item): item is string => Boolean(item));
  const marketSentence = position.length
    ? `${identity.name}'s current position is defined by ${position.join(", ")}.`
    : `${identity.name}'s market position is constrained by the available live data.`;
  const tradingSentence = [
    liquidity ? `tracked DEX liquidity is ${liquidity}` : undefined,
    volume ? `24-hour volume is ${volume}` : undefined,
    performance ? `the latest 24-hour move is ${performance}` : undefined,
  ].filter((item): item is string => Boolean(item)).join("; ");
  const securitySentence = security.available
    ? securitySignals.length
      ? `Contract checks currently show ${securitySignals.join(", ")}.`
      : "Contract security data is available, but it does not provide a strong positive signal by itself."
    : "Contract security data is not available for this token, which limits risk assessment.";
  const riskSentence = risks.length
    ? `The main risks are ${risks.slice(0, 3).join("; ")}.`
    : "The principal uncertainty is whether liquidity, volume, and adoption can remain durable as market conditions change.";
  const outlookSentence = "A stronger outlook would require deeper liquidity, sustained trading activity, and clearer evidence of ecosystem adoption; weaker volume, deteriorating liquidity, or new contract-risk findings would undermine the case.";

  return {
    investmentThesis: `${identity.name} (${identity.symbol}) is a ${sector} asset. ${marketSentence} ${tradingSentence ? `${tradingSentence}.` : ""} ${securitySentence} ${riskSentence} ${outlookSentence} Based on the retrieved evidence, it merits assessment on its demonstrated market depth and risk profile rather than a generic label.`,
    analystVerdict: `${identity.name} is best assessed through its ${sector} positioning, current liquidity and volume, and the specific contract-risk signals retrieved for this report.`,
    overview: `${identity.name} (${identity.symbol}) is classified as ${sector}${identity.chain ? ` on ${identity.chain}` : ""}. ${marketSentence}`,
    supportingReasons: support,
    keyRisks: risks.length ? risks.slice(0, 5) : ["Live market data remains the main basis for assessing this token."],
    outlookPositive: ["Sustained liquidity and trading-volume growth.", "Improving ecosystem adoption or exchange access."],
    outlookNegative: ["Falling liquidity or trading activity.", "New contract-security or holder-concentration concerns."],
  };
}

export async function generateTokenReport(
  identity: TokenIdentity,
  market: MarketData,
  dex: DexData,
  security: SecurityData,
  topExchanges: ExchangeListing[],
  scorecard: Scorecard,
  confidenceScore: number,
  tokenAgeDays: number | undefined,
  pairAgeDays: number | undefined,
  launchDate: string | undefined,
  volumeTrendPercent: number | undefined
): Promise<AIReport> {
  const dataBlock = buildDataBlock(
    identity,
    market,
    dex,
    security,
    topExchanges,
    scorecard,
    confidenceScore,
    tokenAgeDays,
    pairAgeDays,
    launchDate,
    volumeTrendPercent
  );

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the complete structured dataset collected from CoinGecko, DexScreener, GeckoTerminal, and GoPlus Security for ${identity.name} (${identity.symbol}):\n${dataBlock}\n\n${REPORT_JSON_INSTRUCTIONS}`,
    },
  ];

  const confidenceFallback = () =>
    deterministicConfidenceReasoning({
      securityAvailable: security.available,
      holderDataAvailable: security.top10HolderPercent !== undefined,
      dexPairCount: dex.pairCount,
    });
  const evidenceFallback = () =>
    buildEvidenceBasedFallback(identity, market, dex, security, topExchanges, launchDate);

  // Two attempts: most transient issues (rate limits, one-off truncation)
  // don't repeat. Every attempt uses provider-enforced JSON plus recovery.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLM(messages, { json: true });
      const parsed = parseReport(raw);
      if (parsed) {
        return {
          ...parsed,
          analystVerdict: parsed.analystVerdict || evidenceFallback().analystVerdict,
          confidenceReasoning: parsed.confidenceReasoning || confidenceFallback(),
        };
      }
    } catch {
      /* provider-level failure (both Gemini and Groq) — try again once */
    }
  }

  const fallback = evidenceFallback();

  // A provider outage should never erase the investment thesis. This fallback
  // uses only the token-specific dataset already collected for this report.
  return {
    ...fallback,
    marketActivitySummary: "",
    tokenomicsExplanation: fallbackTokenomicsExplanation(
      market.circulatingSupply,
      market.maxSupply
    ),
    marketLiquidityExplanation: fallbackMarketLiquidityExplanation(
      market.volume24h,
      market.marketCap,
      dex.totalLiquidityUsd
    ),
    confidenceReasoning: confidenceFallback(),
  };
}

export async function generateComparisonConclusion(
  reports: {
    identity: TokenIdentity;
    market: MarketData;
    scorecard: Scorecard;
    ai: AIReport;
  }[]
): Promise<string> {
  const summary = reports
    .map(
      (r) =>
        `${r.identity.symbol}: price $${r.market.priceUsd ?? "?"}, 24h ${
          r.market.change24h?.toFixed(2) ?? "?"
        }%, market cap $${r.market.marketCap ?? "?"}, overall health ${
          r.scorecard.overallHealthScore
        }/100, thesis: "${r.ai.investmentThesis.slice(0, 200)}"`
    )
    .join("\n");

  try {
    const raw = await callLLM([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Compare these tokens using only this data:\n${summary}\n\nWrite a plain-language 3-5 sentence comparison conclusion that highlights the concrete tradeoffs between them. Do not invent numbers. Do not use generic labels like "Buy" or "Watch" — describe the actual differences in their data and let the reader decide. Respond with plain text only, no JSON.`,
      },
    ]);
    return raw.trim();
  } catch {
    return "An AI comparison summary couldn't be generated right now, but the data table above is accurate and up to date.";
  }
}

export async function answerFollowUp(
  reportContext: string,
  history: ChatMessage[],
  question: string
): Promise<string> {
  try {
    const raw = await callLLM([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the structured report data already generated for this token:\n${reportContext}\n\nAnswer the user's follow-up question using only this data and general, clearly-labeled educational context. Never invent numbers. Never give financial advice. Be concise.`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ]);
    return raw.trim();
  } catch {
    return "Scout couldn't reach the AI service just now. Please try again in a moment.";
  }
}

export async function classifyIntent(query: string): Promise<{
  intent: "analyze" | "compare" | "question";
  tokens: string[];
}> {
  try {
    const raw = await callLLM([
      {
        role: "system",
        content:
          "You extract structured intent from a crypto search query. Respond with ONLY raw JSON, no markdown fences.",
      },
      {
        role: "user",
        content: `Query: "${query}"\n\nRespond with JSON: {"intent": "analyze" | "compare" | "question", "tokens": string[]} where tokens are the token tickers or names mentioned (uppercase tickers where possible). Use "compare" only if two or more tokens are being compared against each other. Use "question" only if this is a general question not naming a specific token to analyze.`,
      },
    ], { json: true });
    const parsed = JSON.parse(extractJsonSubstring(raw));
    return {
      intent: parsed.intent ?? "analyze",
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    };
  } catch {
    // Fall back to a naive heuristic so search still works if the LLM is down.
    const lower = query.toLowerCase();
    if (lower.includes(" vs ") || lower.includes("compare")) {
      const tokens = query
        .replace(/compare/gi, "")
        .split(/ vs | and /i)
        .map((t) => t.trim())
        .filter(Boolean);
      return { intent: "compare", tokens };
    }
    const match = query.match(/[A-Za-z0-9]+/g) ?? [];
    return { intent: "analyze", tokens: [match[match.length - 1] ?? query] };
  }
}
