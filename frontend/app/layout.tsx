import type { Metadata } from "next";
import { Inter, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "../components/Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ComplianceRadar — AI Regulatory Monitoring for Indian SMEs",
  description:
    "Never miss a regulatory change again. AI-powered compliance monitoring for GST, RBI, SEBI and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSans.variable}`}>
      <body className="font-sans antialiased bg-slate-50 min-h-screen text-slate-900">
        <Nav />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
