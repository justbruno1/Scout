"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { cx } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-40 w-full transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-bg/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0">
          <Logo size={22} />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <Link
            href="/#how-it-works"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            How it Works
          </Link>
          <Link
            href="/#features"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Features
          </Link>
        </nav>

        <Link
          href="/#hero-search"
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg transition-transform hover:scale-105"
        >
          Analyze Token
        </Link>
      </div>
    </header>
  );
}
