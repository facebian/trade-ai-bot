import { NextResponse } from "next/server";
import { getMarketData, getOHLCV } from "@/lib/exchange";
import { TradingPair } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pair = (process.env.TRADING_PAIR ||
      TradingPair.BTC_USDT) as TradingPair;
    const [marketData, candles] = await Promise.all([
      getMarketData(pair),
      getOHLCV(pair, 100),
    ]);
    return NextResponse.json({ marketData, candles });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
