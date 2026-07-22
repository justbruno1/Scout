export const metadata = {
  title: "Scout API documentation",
  description: "x402-enabled API documentation for Scout.",
};

export default function DocsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-slate-900 dark:text-slate-100">
      <h1 className="text-4xl font-bold">Scout API</h1>
      <p className="mt-4 text-lg">The public production endpoint is <code>https://askscout.xyz</code>.</p>
      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Health</h2>
        <p><code>GET /health</code> returns a public, uncached health response.</p>
      </section>
      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Paid token analysis</h2>
        <p><code>GET or POST /api/v1/analyze</code> accepts a token query as <code>q</code>. A request without payment receives HTTP 402 with both an <code>accepts</code> array and a base64-encoded <code>PAYMENT-REQUIRED</code> header.</p>
        <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-sm text-slate-100">{`curl 'https://askscout.xyz/api/v1/analyze?q=ETH'\n# HTTP 402 → read PAYMENT-REQUIRED\n# sign one accepted option and retry with PAYMENT-SIGNATURE`}</pre>
        <p>Scout uses x402 v2. A replay without a verified payment is challenged again and never generates a report.</p>
      </section>
      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Operational behavior</h2>
        <p>Allowed browser origins are configured by <code>ASKSCOUT_ALLOWED_ORIGINS</code>. The paid API applies a 30-request-per-minute best-effort limit per client address and returns structured JSON errors.</p>
      </section>
    </main>
  );
}
