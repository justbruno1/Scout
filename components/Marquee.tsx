"use client";

import type { ReactNode } from "react";

export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="scout-marquee-track flex w-max items-center gap-10 whitespace-nowrap">
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
