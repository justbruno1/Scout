import { NextRequest, NextResponse } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";

function requestId() {
  return crypto.randomUUID();
}

function allowedOrigins() {
  const configured = process.env.ASKSCOUT_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured?.length
    ? configured
    : [
        "https://askscout.xyz",
        "https://www.askscout.xyz",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
}

export function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE, X-Request-ID",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-Request-ID",
    "Access-Control-Max-Age": "86400",
  });

  if (origin && allowedOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export function optionsResponse(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export function apiJson(
  request: NextRequest,
  body: unknown,
  init: ResponseInit = {}
) {
  const headers = corsHeaders(request);
  const suppliedRequestId = request.headers.get(REQUEST_ID_HEADER);
  headers.set(REQUEST_ID_HEADER, suppliedRequestId || requestId());
  headers.set("Cache-Control", "no-store, max-age=0");

  for (const [key, value] of new Headers(init.headers)) headers.set(key, value);

  return NextResponse.json(body, { ...init, headers });
}
