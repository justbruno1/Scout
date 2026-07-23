import { NextRequest } from "next/server";
import { apiJson, optionsResponse } from "@/lib/http";
import { buildTokenReport, TokenNotFoundError } from "@/lib/reportBuilder";
import { negotiatePayment, paymentRequiredBody, settlePayment } from "@/lib/x402";

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

async function queryFor(request: NextRequest) {
  if (request.method === "GET") return request.nextUrl.searchParams.get("q")?.trim() || "";
  const body = (await request.json().catch(() => null)) as { q?: unknown } | null;
  return typeof body?.q === "string" ? body.q.trim() : "";
}

function requestId(request: NextRequest) {
  return request.headers.get("x-request-id") || "unknown";
}

async function paidAnalyze(request: NextRequest) {
  if (rateLimited(request)) {
    return apiJson(request, { error: "rate_limited", message: "Too many requests. Try again in one minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let negotiation;
  try {
    negotiation = await negotiatePayment(request);
  } catch (error) {
    console.error("[x402] facilitator initialization or negotiation failed", { requestId: requestId(request), error });
    return apiJson(
      request,
      { error: "payment_service_unavailable", message: "Scout's payment facilitator is not configured or is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (negotiation.type === "payment-error") {
    const body = paymentRequiredBody(negotiation.response.headers, negotiation.response.body ?? {});
    console.info("[x402] payment required or rejected", { requestId: requestId(request), status: negotiation.response.status });
    return apiJson(request, body, { status: negotiation.response.status, headers: negotiation.response.headers });
  }

  if (negotiation.type !== "payment-verified") {
    return apiJson(request, { error: "payment_required", message: "A payment authorization is required." }, { status: 402 });
  }

  const query = await queryFor(request);
  if (!query) return apiJson(request, { error: "invalid_request", message: "Provide a token query in q." }, { status: 400 });
  if (query.length > 180) return apiJson(request, { error: "invalid_request", message: "q must be 180 characters or fewer." }, { status: 400 });

  try {
    const report = await buildTokenReport(query);
    const settlement = await settlePayment(negotiation);
    if (!settlement.success) {
      console.warn("[x402] settlement failed", { requestId: requestId(request), reason: settlement.errorReason });
      return apiJson(
        request,
        paymentRequiredBody(settlement.headers, settlement.response.body ?? {}),
        { status: settlement.response.status, headers: settlement.headers }
      );
    }

    console.info("[x402] payment settled and report served", { requestId: requestId(request) });
    return apiJson(request, { report }, { status: 200, headers: settlement.headers });
  } catch (error) {
    if (error instanceof TokenNotFoundError) {
      return apiJson(request, { error: "token_not_found", message: error.message }, { status: 404 });
    }
    console.error("[api] paid analysis failed", { requestId: requestId(request), error });
    return apiJson(request, { error: "analysis_failed", message: "Scout could not complete this research request." }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return paidAnalyze(request);
}

export async function POST(request: NextRequest) {
  return paidAnalyze(request);
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}
