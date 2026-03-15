import Anthropic from "@anthropic-ai/sdk";
import { ClaudeRequest, ClaudeAnalysis } from "./types";
import { logClaude } from "./logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ─── Системный промпт ─────────────────────────────────────────────────────────
// Определяет роль и правила поведения Claude как торгового агента

const SYSTEM_PROMPT = `Ты — опытный криптовалютный трейдер и риск-менеджер.
Ты анализируешь технические индикаторы, рыночный сентимент и новости для принятия торговых решений.

ТВОИ ПРАВИЛА:
- Отвечай ТОЛЬКО валидным JSON, без лишнего текста
- Будь консервативным — капитал важнее прибыли
- Никогда не открывай BUY если уже есть открытая позиция
- Никогда не открывай SELL если нет открытой позиции
- При высокой неопределённости выбирай HOLD
- Учитывай все данные в комплексе, не только один индикатор

СИГНАЛЫ ДЛЯ BUY:
- RSI < 35 (перепроданность)
- Цена у нижней полосы Боллинджера
- MACD пересечение вверх
- Объём выше среднего при росте цены
- Fear & Greed < 30 (рынок в страхе — хорошее время для покупки)
- Паттерн молот или бычье поглощение

СИГНАЛЫ ДЛЯ SELL:
- RSI > 65 (перекупленность)
- Цена у верхней полосы Боллинджера
- MACD пересечение вниз
- Отрицательные новости
- Fear & Greed > 75 (эйфория — время фиксировать прибыль)
- Паттерн падающая звезда или медвежье поглощение

ФОРМАТ ОТВЕТА (строго JSON):
{
  "decision": "BUY" | "SELL" | "HOLD",
  "reasoning": "подробное объяснение на русском (2-3 предложения)",
  "confidence": 0-100,
  "suggestedSize": 0-100,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "stopLoss": число или null,
  "takeProfit": число или null,
  "keyFactors": ["фактор 1", "фактор 2", "фактор 3"]
}`;

// ─── Основная функция анализа ─────────────────────────────────────────────────
// Отправляет данные в Claude и возвращает торговое решение

export async function analyzeMarket(
  request: ClaudeRequest,
): Promise<ClaudeAnalysis> {
  const prompt = buildPrompt(request);

  const message = await anthropic.messages.create({
    model: process.env.BOT_REQUEST_CLAUDE_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text")
    throw new Error("Unexpected response type from Claude");

  try {
    // Extract first JSON object from response (handles markdown blocks + preamble text)
    const match = content.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found");
    const analysis = JSON.parse(match[0]) as ClaudeAnalysis;

    logClaude({
      prompt,
      rawResponse: content.text,
      decision: analysis.decision,
      confidence: analysis.confidence,
    });

    return analysis;
  } catch {
    console.error("[claude] Failed to parse response:", content.text);
    throw new Error(`Failed to parse Claude response: ${content.text}`);
  }
}

// ─── Построение промпта ───────────────────────────────────────────────────────
// Формирует детальное сообщение с рыночными данными для Claude

function buildPrompt(req: ClaudeRequest): string {
  const {
    marketData,
    indicators,
    sentiment,
    news,
    position,
    recentTrades,
    balance,
  } = req;

  // Позиция цены относительно EMA200 — определяет глобальный тренд
  const emaPosition =
    marketData.price > indicators.ema200
      ? "ВЫШЕ EMA200 (бычий рынок)"
      : "НИЖЕ EMA200 (медвежий рынок)";

  // Позиция цены относительно полос Боллинджера
  const bbPosition =
    marketData.price > indicators.bollingerUpper
      ? "ВЫШЕ верхней полосы (перекупленность)"
      : marketData.price < indicators.bollingerLower
        ? "НИЖЕ нижней полосы (перепроданность)"
        : "ВНУТРИ полос (нейтрально)";

  const newsText =
    news.length > 0
      ? news
          .map((n) => `  [${n.sentiment}] ${n.title} (${n.hoursAgo}ч назад)`)
          .join("\n")
      : "  Нет свежих новостей";

  const tradesText =
    recentTrades.length > 0
      ? recentTrades
          .slice(0, 5)
          .map(
            (t) =>
              `  ${t.type} @ $${t.price.toFixed(0)} → P&L: ${
                t.pnl !== null
                  ? (t.pnl >= 0 ? "+" : "") + "$" + t.pnl.toFixed(2)
                  : "открыта"
              }`,
          )
          .join("\n")
      : "  Сделок ещё не было";

  return `
═══════════════ РЫНОЧНЫЕ ДАННЫЕ ═══════════════
Пара: ${marketData.symbol}
Цена: $${marketData.price.toFixed(2)}
Изменение 1ч:  ${marketData.priceChange1h >= 0 ? "+" : ""}${marketData.priceChange1h.toFixed(2)}%
Изменение 24ч: ${marketData.priceChange24h >= 0 ? "+" : ""}${marketData.priceChange24h.toFixed(2)}%
Объём 24ч: $${(marketData.volume24h / 1_000_000).toFixed(1)}M
Максимум 24ч: $${marketData.high24h.toFixed(0)}
Минимум 24ч:  $${marketData.low24h.toFixed(0)}

═══════════════ ТЕХНИЧЕСКИЕ ИНДИКАТОРЫ ═══════════════
ОСЦИЛЛЯТОРЫ:
  RSI (14): ${indicators.rsi14.toFixed(1)} ${indicators.rsi14 < 30 ? "⚠️ ПЕРЕПРОДАННОСТЬ" : indicators.rsi14 > 70 ? "⚠️ ПЕРЕКУПЛЕННОСТЬ" : ""}
  RSI (7):  ${indicators.rsi7.toFixed(1)}
  Stochastic %K/%D: ${indicators.stochK.toFixed(1)} / ${indicators.stochD.toFixed(1)}

ТРЕНД:
  MACD: ${indicators.macd.toFixed(4)} | Signal: ${indicators.macdSignal.toFixed(4)} | Histogram: ${indicators.macdHistogram.toFixed(4)} ${indicators.macdHistogram > 0 ? "📈" : "📉"}
  EMA 20: $${indicators.ema20.toFixed(0)} | EMA 50: $${indicators.ema50.toFixed(0)} | EMA 200: $${indicators.ema200.toFixed(0)}
  Позиция цены: ${emaPosition}
  Тренд: ${indicators.trend}

УРОВНИ:
  Bollinger: $${indicators.bollingerLower.toFixed(0)} / $${indicators.bollingerMiddle.toFixed(0)} / $${indicators.bollingerUpper.toFixed(0)}
  Ширина Bollinger: ${indicators.bollingerWidth.toFixed(2)}% ${indicators.bollingerWidth < 2 ? "(низкая волатильность — ожидать пробой)" : ""}
  Позиция цены: ${bbPosition}
  Поддержка: $${indicators.supportLevel.toFixed(0)}
  Сопротивление: $${indicators.resistanceLevel.toFixed(0)}
  ATR: $${indicators.atr.toFixed(0)}

ОБЪЁМ:
  Текущий / Средний: ${indicators.volumeRatio.toFixed(2)}x ${indicators.volumeRatio > 1.5 ? "⚠️ АНОМАЛЬНЫЙ ОБЪЁМ" : ""}

ПАТТЕРН СВЕЧЕЙ: ${indicators.candlePattern}

═══════════════ СЕНТИМЕНТ РЫНКА ═══════════════
Fear & Greed: ${sentiment.fearAndGreedIndex}/100 — ${sentiment.fearAndGreedLabel}
BTC Dominance: ${sentiment.btcDominance.toFixed(1)}%
Long/Short Ratio: ${sentiment.longShortRatio.toFixed(2)} ${sentiment.longShortRatio > 1.5 ? "(много лонгов)" : sentiment.longShortRatio < 0.7 ? "(много шортов)" : ""}
Funding Rate: ${sentiment.fundingRate.toFixed(4)}% ${Math.abs(sentiment.fundingRate) > 0.05 ? "⚠️ ЭКСТРЕМАЛЬНЫЙ" : ""}
Изменение Market Cap 24ч: ${sentiment.marketCapChange24h >= 0 ? "+" : ""}${sentiment.marketCapChange24h.toFixed(2)}%

═══════════════ НОВОСТИ ═══════════════
${newsText}

═══════════════ ПОРТФЕЛЬ ═══════════════
Баланс USDT: $${balance.toFixed(2)}
Открытая позиция: ${
    position
      ? `${position.amount.toFixed(6)} BTC @ $${position.entryPrice.toFixed(0)} | P&L: ${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)${position.stopLoss ? ` | SL: $${position.stopLoss}` : ""}${position.takeProfit ? ` | TP: $${position.takeProfit}` : ""}`
      : "Нет открытых позиций"
  }

═══════════════ ИСТОРИЯ СДЕЛОК ═══════════════
${tradesText}

Проанализируй все данные и верни решение строго в формате JSON.`;
}
