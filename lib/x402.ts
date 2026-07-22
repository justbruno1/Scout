import { NextRequest } from "next/server";

export const X402_PAYMENT_HEADER = "PAYMENT-SIGNATURE";
export const X402_REQUIRED_HEADER = "PAYMENT-REQUIRED";

const X_LAYER_NETWORK = "eip155:196";
const X_LAYER_USDT0 = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
const SCOUT_OWNER_WALLET = "0xdd593acfdbbb438ca3850405819c1e7e70e0081a";
const PRICE_ATOMIC = "100000"; // 0.10 USDT0 (6 decimals)

type PaymentRequirement = {
  scheme: "exact";
  network: typeof X_LAYER_NETWORK;
  asset: typeof X_LAYER_USDT0;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: { name: "USD₮0"; version: "1" };
};

export type PaymentRequired = {
  x402Version: 2;
  resource: { url: string; description: string; mimeType: string };
  accepts: PaymentRequirement[];
};

function publicOrigin() {
  const configured = process.env.ASKSCOUT_PUBLIC_URL?.trim() || "https://askscout.xyz";
  return new URL(configured).origin;
}

function payTo() {
  const configured = process.env.PAY_TO?.trim() || SCOUT_OWNER_WALLET;
  if (!/^0x[a-fA-F0-9]{40}$/.test(configured)) {
    throw new Error("PAY_TO must be an EVM address");
  }
  return configured;
}

/**
 * Builds the public x402 v2 offer used by OKX's pre-payment check. It is
 * intentionally independent of seller API credentials: discovering a paid
 * endpoint must not fail before a buyer can read its accepted payment option.
 */
export function createPaymentRequired(pathname: string): PaymentRequired {
  return {
    x402Version: 2,
    resource: {
      url: `${publicOrigin()}${pathname}`,
      description: "Scout evidence-based token research and risk-analysis report",
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: X_LAYER_NETWORK,
        asset: X_LAYER_USDT0,
        amount: process.env.X402_PRICE_ATOMIC?.trim() || PRICE_ATOMIC,
        payTo: payTo(),
        maxTimeoutSeconds: 300,
        extra: { name: "USD₮0", version: "1" },
      },
    ],
  };
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

export function paymentRequiredHeaders(requirements: PaymentRequired) {
  return {
    [X402_REQUIRED_HEADER]: encode(requirements),
    "X-Payment-Protocol": "x402",
  };
}

/**
 * Until a settlement provider is configured, a replay is safely challenged
 * again. This prevents a report from being delivered without a verified
 * payment while still keeping the endpoint discoverable to buyer prechecks.
 */
export function isPaymentReplay(request: NextRequest) {
  return Boolean(request.headers.get(X402_PAYMENT_HEADER));
}
