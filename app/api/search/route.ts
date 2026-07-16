import { NextRequest, NextResponse } from "next/server";
import { searchCoins } from "@/lib/coingecko";
import { classifyIntent } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const mode = req.nextUrl.searchParams.get("mode"); // "suggest" | "intent"

  if (!q) return NextResponse.json({ suggestions: [] });

  if (mode === "intent") {
    try {
      const intent = await classifyIntent(q);
      return NextResponse.json(intent);
    } catch (err) {
      return NextResponse.json({ intent: "analyze", tokens: [q] });
    }
  }

  try {
    const hits = await searchCoins(q);
    return NextResponse.json({ suggestions: hits });
  } catch (err) {
    return NextResponse.json({ suggestions: [] });
  }
}
