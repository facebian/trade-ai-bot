import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateForexIndicators, type ForexIndicators } from "@/lib/forex-indicators";

const CURRENCIES = [
  "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
  "CNY", "HKD", "SGD", "NOK", "SEK", "DKK", "PLN",
  "CZK", "HUF", "TRY", "BRL", "INR",
];

export interface CurrencyAnalysisResult {
  code: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  predictedPrice: number;
  reasoning: string;
  indicators: ForexIndicators;
}

const client = new Anthropic();

export async function POST() {
  try {
    // 90 calendar days ≈ 60 trading days — enough for all indicators (SMA50 needs 50)
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const startStr = start.toISOString().split("T")[0];

    const url = `https://api.frankfurter.app/${startStr}..?from=USD&to=${CURRENCIES.join(",")}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
    const data: {
      rates: Record<string, Record<string, number>>;
    } = await res.json();

    const dates = Object.keys(data.rates).sort();

    // Build price series and calculate indicators per currency
    const forexData: Record<string, { prices: number[]; ind: ForexIndicators }> = {};
    for (const code of CURRENCIES) {
      const prices = dates.map((d) => data.rates[d][code]).filter(Boolean);
      const ind = calculateForexIndicators(prices);
      if (ind) forexData[code] = { prices, ind };
    }

    const codesAvailable = Object.keys(forexData);

    // Build compact summary for Claude (avoid sending full price arrays)
    const summary = codesAvailable.map((code) => {
      const { ind } = forexData[code];
      return {
        code,
        currentPrice: +ind.currentPrice.toFixed(6),
        prevPrice: +ind.prevPrice.toFixed(6),
        changePercent: +ind.changePercent.toFixed(4),
        rsi14: +ind.rsi14.toFixed(2),
        ema9: +ind.ema9.toFixed(6),
        ema21: +ind.ema21.toFixed(6),
        sma50: +ind.sma50.toFixed(6),
        emaSignal: ind.ema9 > ind.ema21 ? "bullish" : "bearish",
        macd: +ind.macd.toFixed(6),
        macdSignal: +ind.macdSignal.toFixed(6),
        macdHistogram: +ind.macdHistogram.toFixed(6),
        macdCross: ind.macdHistogram > 0 ? "bullish" : "bearish",
        bbPercent: +ind.bbPercent.toFixed(2),
        stochK: +ind.stochK.toFixed(2),
        stochD: +ind.stochD.toFixed(2),
        roc10: +ind.roc10.toFixed(4),
      };
    });

    const message = await client.messages.create({
      model: process.env.BOT_REQUEST_CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `Ты — аналитик валютного рынка Forex. Анализируй технические индикаторы для валютных пар USD/XXX (дневной таймфрейм).

Правила сигналов (с точки зрения иностранной валюты vs USD):
- BUY: иностранная валюта ожидает укрепления (курс USD/XXX падает — за 1 USD дают меньше XXX)
- SELL: иностранная валюта ожидает ослабления (курс USD/XXX растёт — за 1 USD дают больше XXX)
- HOLD: нет чёткого сигнала

Верни ТОЛЬКО валидный JSON массив, без markdown, без пояснений.`,
      messages: [
        {
          role: "user",
          content: `Проанализируй следующие валютные пары (база: USD, 1 USD = currentPrice единиц XXX):

${JSON.stringify(summary, null, 2)}

Верни JSON массив объектов — ровно по одному на каждую валюту в том же порядке:
[
  {
    "code": "EUR",
    "signal": "BUY" | "SELL" | "HOLD",
    "confidence": <число 0-100>,
    "predictedPrice": <ожидаемый курс 1 USD = ? XXX на следующий торговый день>,
    "reasoning": "<1-2 предложения на русском>"
  }
]`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Claude returned invalid JSON");

    const claudeAnalysis: {
      code: string;
      signal: "BUY" | "SELL" | "HOLD";
      confidence: number;
      predictedPrice: number;
      reasoning: string;
    }[] = JSON.parse(jsonMatch[0]);

    const results: CurrencyAnalysisResult[] = claudeAnalysis
      .filter((a) => forexData[a.code])
      .map((a) => ({
        ...a,
        indicators: forexData[a.code].ind,
      }));

    return NextResponse.json({ results, updatedAt: Date.now() });
  } catch (err) {
    console.error("[currency-analysis]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
