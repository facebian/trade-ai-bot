import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const syne = Syne({ subsets: ["latin"], variable: "--font-sans" });
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TradeAI Bot",
  description: "AI-powered crypto trading dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(syne.variable, spaceMono.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
