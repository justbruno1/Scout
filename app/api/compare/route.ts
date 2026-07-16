import { NextRequest, NextResponse } from "next/server";
import { buildTokenReport, TokenNotFoundError } from "@/lib/reportBuilder";
import { generateComparisonConclusion } from "@/lib/ai";
import type { TokenReport } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const tokensParam = req.nextUrl.searchParams.get("tokens");
  if (!tokensParam) {
    return NextResponse.json(
      { error: "Missing query parameter 'tokens' (comma-separated)" },
      { status: 400 }
    );
  }

  const queries = tokensParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4); // cap comparisons at 4 tokens

  if (queries.length < 2) {
    return NextResponse.json(
      { error: "Provide at least two tokens to compare" },
      { status: 400 }
    );
  }

  const results = await Promise.allSettled(queries.map((q) => buildTokenReport(q)));

  const reports: TokenReport[] = [];
  const notFound: string[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      reports.push(r.value);
    } else if (r.reason instanceof TokenNotFoundError) {
      notFound.push(queries[i]);
    } else {
      console.error(`Compare route error for "${queries[i]}":`, r.reason);
      notFound.push(queries[i]);
    }
  });

  if (reports.length < 2) {
    return NextResponse.json(
      {
        error: "Could not find enough of the requested tokens to compare.",
        notFound,
      },
      { status: 404 }
    );
  }

  let aiConclusion = "";
  try {
    aiConclusion = await generateComparisonConclusion(reports);
  } catch (err) {
    aiConclusion =
      "AI comparison summary is temporarily unavailable, but the data tables above are live.";
  }

  return NextResponse.json({ tokens: reports, aiConclusion, notFound });
}
