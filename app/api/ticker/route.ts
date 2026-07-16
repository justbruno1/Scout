import { NextResponse } from "next/server";
import { getTickerReadings } from "@/lib/ticker";

export const runtime = "nodejs";

export async function GET() {
  try {
    const readings = await getTickerReadings();
    return NextResponse.json({ readings });
  } catch {
    return NextResponse.json({ readings: [] });
  }
}
