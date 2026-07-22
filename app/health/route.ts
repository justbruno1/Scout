import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { status: "healthy", version: "1.0", service: "Scout", endpoint: "https://askscout.xyz" },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
