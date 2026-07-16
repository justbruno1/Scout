"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useScoutStore } from "@/store/useScoutStore";

const PLACEHOLDERS = [
  "Analyze PEPE",
  "Analyze ONDO",
  "Compare PEPE vs BONK",
  "Should I buy HYPE?",
];

interface Suggestion {
  id: string;
  symbol: string;
  name: string;
  thumb?: string;
}

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const addRecentQuery = useScoutStore((s) => s.addRecentQuery);
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function submit(query?: string) {
    const q = (query ?? value).trim();
    if (!q) return;
    setSubmitting(true);
    addRecentQuery(q);
    router.push(`/analyze?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="relative w-full max-w-2xl">
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="group relative flex items-center gap-3 rounded-2xl border border-border bg-bg-raised px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors focus-within:border-accent/50"
      >
        <Search className="h-5 w-5 shrink-0 text-text-secondary transition-colors group-focus-within:text-accent" />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full bg-transparent text-base text-text-primary placeholder:text-text-secondary/70 focus:outline-none sm:text-lg"
        />
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          aria-label="Analyze"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-bg transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.form>

      {showSuggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-xl"
        >
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s.id}
              onMouseDown={() => submit(s.symbol)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-raised"
            >
              <span className="font-mono text-sm text-accent">{s.symbol}</span>
              <span className="text-sm text-text-secondary">{s.name}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
