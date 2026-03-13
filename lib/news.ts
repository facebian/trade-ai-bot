import { NewsItem } from "./types";

// ─── Получение новостей ───────────────────────────────────────────────────────
// Используем бесплатный CryptoCompare API — до 100k запросов в месяц
// Ключ можно получить на: https://min-api.cryptocompare.com

export async function getCryptoNews(symbol = "BTC"): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
    const url = `https://min-api.cryptocompare.com/data/v2/news/?categories=${symbol}&limit=5${apiKey ? `&api_key=${apiKey}` : ""}`;

    const res = await fetch(url, {
      next: { revalidate: 300 }, // Кэшируем на 5 минут — новости не меняются каждую секунду
    });

    const data = await res.json();
    if (!data.Data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.Data.slice(0, 5).map((item: any): NewsItem => {
      const hoursAgo = Math.floor(
        (Date.now() / 1000 - item.published_on) / 3600,
      );

      return {
        title: item.title,
        sentiment: detectSentiment(item.title),
        hoursAgo,
      };
    });
  } catch {
    return []; // Не падаем если новости недоступны — бот продолжит работу
  }
}

// ─── Определение тональности новости ─────────────────────────────────────────
// Простой keyword-based анализ без внешних зависимостей

function detectSentiment(title: string): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  const text = title.toLowerCase();

  const positiveWords = [
    "surge",
    "rally",
    "bullish",
    "rise",
    "gain",
    "high",
    "approve",
    "adoption",
    "buy",
    "pump",
    "breakout",
    "ath",
    "record",
    "growth",
  ];

  const negativeWords = [
    "crash",
    "fall",
    "bearish",
    "drop",
    "ban",
    "hack",
    "fear",
    "sell",
    "dump",
    "collapse",
    "liquidation",
    "loss",
    "fraud",
    "scam",
  ];

  const isPositive = positiveWords.some((word) => text.includes(word));
  const isNegative = negativeWords.some((word) => text.includes(word));

  // Если оба типа слов — нейтрально (противоречивая новость)
  if (isPositive && isNegative) return "NEUTRAL";
  if (isPositive) return "POSITIVE";
  if (isNegative) return "NEGATIVE";
  return "NEUTRAL";
}
