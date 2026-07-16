import { Hero } from "@/components/Hero";
import { SupportsRow } from "@/components/SupportsRow";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <SupportsRow />
      <HowItWorks />
      <Features />
      <Footer />
    </main>
  );
}
