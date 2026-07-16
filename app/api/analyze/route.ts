import { NextRequest, NextResponse } from "next/server";
import { buildTokenReport, TokenNotFoundError } from "@/lib/reportBuilder";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const report = await buildTokenReport(query);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof TokenNotFoundError) {
      return NextResponse.json(
        { error: err.message, suggestions: err.suggestions },
        { status: 404 }
      );
    }
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "Something went wrong while analyzing this token. Please try again." },
      { status: 500 }
    );
  }
}
