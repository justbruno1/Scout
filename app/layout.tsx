import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Scout — Research any token in under 30 seconds",
  description:
    "Scout is an AI research analyst that combines real-time market data, DEX information, contract security, and tokenomics into one clear, evidence-backed report.",
  metadataBase: new URL("https://scout.example.com"),
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Scout — Research any token in under 30 seconds",
    description:
      "Real-time market data, DEX liquidity, contract security, and tokenomics — explained by AI.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-bg text-text-primary font-sans antialiased">
        <QueryProvider>
          <Navbar />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
