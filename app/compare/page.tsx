"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSequence } from "@/components/LoadingSequence";
import { ComparisonTable } from "@/components/ComparisonTable";
import { SearchBar } from "@/components/SearchBar";
import type { TokenReport } from "@/lib/types";

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingSequence />}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const params = useSearchParams();
  const tokensParam = params.get("tokens") ?? "";

  const [tokens, setTokens] = useState<TokenReport[] | null>(null);
  const [aiConclusion, setAiConclusion] = useState("");
  const [notFound, setNotFound] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokensParam) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/compare?tokens=${encodeURIComponent(tokensParam)}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setLoading(false);
          return;
        }

        setTokens(data.tokens);
        setAiConclusion(data.aiConclusion ?? "");
        setNotFound(data.notFound ?? []);
      } catch {
        if (!cancelled) setError("Scout couldn't reach its data sources. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tokensParam]);

  if (!tokensParam) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <p className="mb-6 text-text-secondary">Try "Compare PEPE vs BONK".</p>
        <SearchBar autoFocus />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pt-8">
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
          <div className="mt-10 w-full">
            <SearchBar />
          </div>
        </motion.div>
      )}

      {!loading && !error && tokens && (
        <ComparisonTable tokens={tokens} aiConclusion={aiConclusion} notFound={notFound} />
      )}
    </main>
  );
}
