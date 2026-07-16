"use client";

import { motion } from "framer-motion";
import { cx } from "@/lib/utils";
import { fadeUp, revealViewport } from "@/lib/motion";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  unavailable?: boolean;
  className?: string;
}

export function Section({ title, children, unavailable, className }: SectionProps) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      className={cx("py-10", className)}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-medium text-text-primary">{title}</h2>
        {unavailable && (
          <span className="rounded-full border border-border bg-bg-raised px-2.5 py-1 text-[11px] text-text-secondary">
            Temporarily unavailable
          </span>
        )}
      </div>
      {children}
      <div className="divider mt-10" />
    </motion.section>
  );
}
