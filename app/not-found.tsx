import Link from "next/link";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Mascot />
      <p className="text-text-secondary">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded-full border border-border bg-bg-raised px-5 py-2.5 text-sm text-text-primary transition-colors hover:border-accent/40"
      >
        Back to Scout
      </Link>
    </main>
  );
}
