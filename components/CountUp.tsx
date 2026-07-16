"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
  value: number;
  formatter: (n: number) => string;
  className?: string;
}

/** Animates from 0 to `value` once it scrolls into view, then just tracks updates. */
export function CountUp({ value, formatter, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 900, bounce: 0 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = formatter(latest);
    });
    return unsub;
  }, [spring, formatter]);

  return (
    <span ref={ref} className={className}>
      {formatter(0)}
    </span>
  );
}
