import { NextResponse } from "next/server";

const BASE_URL = (
  process.env.DZENGI_BASE_URL ?? "https://api-adapter.dzengi.com"
).replace(/\/$/, "");

export interface DzengiTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ticker/24hr`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", error: `HTTP ${res.status}` },
        { status: 200 },
      );
    }

    const data: DzengiTicker[] = await res.json();

    const top25 = data
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 50);

    return NextResponse.json({
      status: "ok",
      tickers: top25,
      fetchedAt: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      fetchedAt: Date.now(),
    });
  }
}
