import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import {
  type HTTPAdapter,
  type HTTPProcessResult,
  type RouteConfig,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@okxweb3/x402-core/server";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { NextRequest } from "next/server";

export const X402_PAYMENT_HEADER = "PAYMENT-SIGNATURE";
export const X402_LEGACY_PAYMENT_HEADER = "X-PAYMENT";
export const X402_REQUIRED_HEADER = "PAYMENT-REQUIRED";

const X_LAYER_NETWORK = "eip155:196";
const DEFAULT_PRICE = "$0.10";
const SCOUT_OWNER_WALLET = "0xdd593acfdbbb438ca3850405819c1e7e70e0081a";

type X402Configuration = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  payTo: string;
  price: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function configuration(): X402Configuration {
  const payTo = process.env.PAY_TO?.trim() || process.env.PAY_TO_ADDRESS?.trim() || SCOUT_OWNER_WALLET;
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error("PAY_TO must be a valid EVM receiving-wallet address");
  }

  return {
    apiKey: requiredEnv("OKX_API_KEY"),
    secretKey: requiredEnv("OKX_SECRET_KEY"),
    passphrase: requiredEnv("OKX_PASSPHRASE"),
    payTo,
    price: process.env.X402_PRICE_USD?.trim() || DEFAULT_PRICE,
  };
}

let initializingServer: Promise<x402HTTPResourceServer> | undefined;

/**
 * Initialises the authenticated OKX facilitator once per warm serverless
 * runtime. The SDK verifies EIP-3009 authorizations and settles the accepted
 * payment before Scout returns a report.
 */
export function getX402Server() {
  if (!initializingServer) {
    initializingServer = (async () => {
      const config = configuration();
      const facilitator = new OKXFacilitatorClient({
        apiKey: config.apiKey,
        secretKey: config.secretKey,
        passphrase: config.passphrase,
        syncSettle: true,
      });
      const resourceServer = new x402ResourceServer(facilitator).register(
        X_LAYER_NETWORK,
        new ExactEvmScheme()
      );
      const server = new x402HTTPResourceServer(resourceServer, {
        "GET /api/v1/analyze": routeConfig(config),
        "POST /api/v1/analyze": routeConfig(config),
      });

      await server.initialize();
      console.info("[x402] OKX facilitator initialized", { network: X_LAYER_NETWORK });
      return server;
    })().catch((error) => {
      // A transient facilitator failure must not poison later warm invocations.
      initializingServer = undefined;
      throw error;
    });
  }
  return initializingServer;
}

function routeConfig(config: X402Configuration): RouteConfig {
  return {
    resource: "/api/v1/analyze",
    description: "Scout evidence-based token research and risk-analysis report",
    mimeType: "application/json",
    accepts: {
      scheme: "exact",
      network: X_LAYER_NETWORK,
      payTo: config.payTo,
      price: config.price,
      maxTimeoutSeconds: 300,
    },
  };
}

function paymentHeader(request: NextRequest) {
  return request.headers.get(X402_PAYMENT_HEADER) || request.headers.get(X402_LEGACY_PAYMENT_HEADER) || undefined;
}

/** Converts a Next request into the SDK's framework-neutral HTTP adapter. */
export function requestContext(request: NextRequest) {
  const adapter: HTTPAdapter = {
    getHeader: (name) => {
      const normalized = name.toLowerCase();
      if (normalized === X402_PAYMENT_HEADER.toLowerCase() || normalized === X402_LEGACY_PAYMENT_HEADER.toLowerCase()) {
        return paymentHeader(request);
      }
      return request.headers.get(name) || request.headers.get(normalized) || undefined;
    },
    getMethod: () => request.method,
    getPath: () => request.nextUrl.pathname,
    getUrl: () => request.url,
    getAcceptHeader: () => request.headers.get("accept") || "application/json",
    getUserAgent: () => request.headers.get("user-agent") || "",
  };

  return {
    adapter,
    path: request.nextUrl.pathname,
    method: request.method,
    paymentHeader: paymentHeader(request),
  };
}

export async function negotiatePayment(request: NextRequest): Promise<HTTPProcessResult> {
  const server = await getX402Server();
  return server.processHTTPRequest(requestContext(request));
}

export async function settlePayment(result: Extract<HTTPProcessResult, { type: "payment-verified" }>) {
  const server = await getX402Server();
  return server.processSettlement(
    result.paymentPayload,
    result.paymentRequirements,
    result.declaredExtensions
  );
}

/** Mirrors the SDK's encoded 402 offer in JSON for simple HTTP clients. */
export function paymentRequiredBody(headers: Record<string, string>, fallback: unknown) {
  const encoded = Object.entries(headers).find(([key]) => key.toLowerCase() === X402_REQUIRED_HEADER.toLowerCase())?.[1];
  if (!encoded) return fallback;

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return fallback;
  }
}
