"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSequence } from "@/components/LoadingSequence";
import { ReportView } from "@/components/ReportView";
import { SearchBar } from "@/components/SearchBar";
import type { TokenReport } from "@/lib/types";

interface Suggestion {
  id: string;
  symbol: string;
  name: string;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<LoadingSequence />}>
      <AnalyzeContent />
    </Suspense>
  );
}

function AnalyzeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "";

  const [report, setReport] = useState<TokenReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setReport(null);

      try {
        // Detect compare intent so "PEPE vs BONK" typed straight into the
        // search box still routes to the comparison experience.
        const intentRes = await fetch(
          `/api/search?mode=intent&q=${encodeURIComponent(query)}`
        );
        const intent = await intentRes.json();
        if (intent.intent === "compare" && intent.tokens?.length >= 2) {
          router.replace(`/compare?tokens=${intent.tokens.join(",")}`);
          return;
        }

        const target = intent.tokens?.[0] || query;
        const res = await fetch(`/api/analyze?q=${encodeURIComponent(target)}`);
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setSuggestions(data.suggestions ?? []);
          setLoading(false);
          return;
        }

        setReport(data.report);
      } catch (err) {
        if (!cancelled) setError("Scout couldn't reach its data sources. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, router]);

  if (!query) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <p className="mb-6 text-text-secondary">Search for a token to analyze.</p>
        <SearchBar autoFocus />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      {loading && <LoadingSequence />}

      {!loading && error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center"
        >
          <p className="text-lg text-text-primary">{error}</p>
          {suggestions.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/analyze?q=${encodeURIComponent(s.symbol)}`)}
                  className="rounded-full border border-border bg-bg-raised px-4 py-2 text-sm text-text-primary transition-colors hover:border-accent/40"
                >
                  {s.symbol} — {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-10 w-full">
            <SearchBar />
          </div>
        </motion.div>
      )}

      {!loading && !error && report && <ReportView report={report} />}
    </main>
  );
}
