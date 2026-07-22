import { NextRequest } from "next/server";
import { apiJson, optionsResponse } from "@/lib/http";
import { createPaymentRequired, isPaymentReplay, paymentRequiredHeaders } from "@/lib/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(request: NextRequest) {
  const now = Date.now();
  const key = clientKey(request);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function requestId(request: NextRequest) {
  return request.headers.get("x-request-id") || "unknown";
}

function paymentChallenge(request: NextRequest) {
  if (rateLimited(request)) {
    return apiJson(request, { error: "rate_limited", message: "Too many requests. Try again in one minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const requirements = createPaymentRequired(request.nextUrl.pathname);
    const replay = isPaymentReplay(request);
    console.info("[x402] payment challenge issued", { requestId: requestId(request), replay });
    return apiJson(request, requirements, { status: 402, headers: paymentRequiredHeaders(requirements) });
  } catch (error) {
    console.error("[x402] challenge configuration error", { requestId: requestId(request), error });
    return apiJson(request, { error: "payment_configuration_error", message: "Scout's payment offer is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return paymentChallenge(request);
}

export async function POST(request: NextRequest) {
  return paymentChallenge(request);
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}
