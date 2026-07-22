const endpoint = process.env.X402_ENDPOINT || "http://127.0.0.1:3000/api/v1/analyze";
const challenge = await fetch(endpoint, { headers: { Accept: "application/json" } });

if (challenge.status !== 402 || !challenge.headers.get("payment-required")) {
  console.error("task-402-pay simulation could not obtain a valid x402 challenge", { status: challenge.status });
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "not-base64-json" },
  body: JSON.stringify({ q: "ETH" }),
});
const body = await response.json();

if (response.status !== 402 || !response.headers.get("payment-required") || body.report) {
  console.error("task-402-pay simulation failed", { status: response.status, body });
  process.exit(1);
}

console.log("task-402-pay simulation passed: malformed payment was challenged again and no report was generated");
