const endpoint = process.env.X402_ENDPOINT || "http://127.0.0.1:3000/api/v1/analyze";
const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
const body = await response.json();
const encoded = response.headers.get("payment-required");
const normalized = encoded?.replace(/-/g, "+").replace(/_/g, "/");
const headerPayload = normalized ? JSON.parse(Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64").toString("utf8")) : null;
const accepts = Array.isArray(body.accepts) ? body.accepts : headerPayload?.accepts;

if (response.status !== 402 || !Array.isArray(accepts) || accepts.length === 0 || !Array.isArray(headerPayload?.accepts)) {
  console.error("x402-check failed", { status: response.status, body });
  process.exit(1);
}

console.log("x402-check passed", { status: response.status, network: accepts[0].network, accepts: accepts.length });
