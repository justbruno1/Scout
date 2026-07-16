"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import { Logo } from "./Logo";

const STEPS = [
  "Searching token...",
  "Fetching market data...",
  "Checking DEX activity...",
  "Analyzing contract...",
  "Reviewing tokenomics...",
  "Generating report...",
  "Almost done...",
];

export function LoadingSequence() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      <Logo size={20} />
      <Mascot status={STEPS[stepIndex]} active size={72} />
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 w-6 rounded-full"
            animate={{
              backgroundColor: i <= stepIndex ? "#C8FF3D" : "#232629",
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
