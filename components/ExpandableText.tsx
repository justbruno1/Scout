"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ExpandableTextProps {
  text: string;
  limit?: number;
  className?: string;
}

export function ExpandableText({ text, limit = 320, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;
  const shown = expanded || !isLong ? text : `${text.slice(0, limit).trimEnd()}…`;

  return (
    <div>
      <motion.p
        layout
        className={className ?? "text-[15px] leading-relaxed text-text-secondary"}
      >
        {shown}
      </motion.p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-accent transition-opacity hover:opacity-80"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
