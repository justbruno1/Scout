"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2 } from "lucide-react";
import { useScoutStore } from "@/store/useScoutStore";
import type { TokenReport } from "@/lib/types";

const SUGGESTED_QUESTIONS = [
  "Why is the risk score high?",
  "Explain this more simply.",
  "What changed today?",
  "Would this suit long-term investors?",
];

export function FollowUpChat({ report }: { report: TokenReport }) {
  const tokenId = report.identity.id;
  const messages = useScoutStore((s) => s.chatByToken[tokenId] ?? []);
  const addChatMessage = useScoutStore((s) => s.addChatMessage);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    addChatMessage(tokenId, { role: "user", content: question });
    setInput("");
    setLoading(true);
    try {
      const reportContext = JSON.stringify({
        identity: report.identity,
        market: report.market,
        scorecard: report.scorecard,
        ai: report.ai,
      });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportContext, history: messages, question }),
      });
      const data = await res.json();
      addChatMessage(tokenId, {
        role: "assistant",
        content: data.answer ?? "Scout couldn't generate a response just now.",
      });
    } catch {
      addChatMessage(tokenId, {
        role: "assistant",
        content: "Scout couldn't reach the AI service just now. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-10">
      <h2 className="mb-5 text-lg font-medium text-text-primary">Ask Scout</h2>

      {messages.length === 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full border border-border bg-bg-raised px-3.5 py-2 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-bg-raised px-4 py-3 text-sm text-text-primary"
                  : "mr-auto max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-bg-elevated px-4 py-3 text-sm leading-relaxed text-text-primary"
              }
            >
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="mr-auto flex items-center gap-2 text-xs text-text-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Scout is thinking...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 rounded-xl border border-border bg-bg-raised px-4 py-3 focus-within:border-accent/50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-bg disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      <div className="divider mt-10" />
    </div>
  );
}
