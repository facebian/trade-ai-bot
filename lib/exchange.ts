import {
  MarketData,
  Indicators,
  PricePoint,
  SentimentData,
  CandlePattern,
  MarketTrend,
} from "./types";

import ccxt, { bybit } from "ccxt";

// ─── Инициализация биржи ──────────────────────────────────────────────────────
// Два singleton-а:
//   publicExchange  — без ключей, только публичные эндпоинты (тикер, свечи)
//   exchange        — с ключами, для приватных эндпоинтов (баланс, ордера)
// Для смены режима вызови resetExchange(sandbox).

// Store singletons on globalThis so they are shared across all Next.js route
// handler module instances (each route gets its own module scope in App Router).
const g = globalThis as typeof globalThis & {
  _exchange: bybit | null;
  _publicExchange: bybit | null;
};
if (g._exchange === undefined) g._exchange = null;
if (g._publicExchange === undefined) g._publicExchange = null;

// Публичный инстанс — без API-ключей
function getPublicExchange(): bybit {
  if (!g._publicExchange) {
    g._publicExchange = new ccxt.bybit({});
  }
  return g._publicExchange;
}

// Приватный инстанс — с ключами (mainnet)
function getExchange(): bybit {
  if (!g._exchange) {
    g._exchange = new ccxt.bybit({
      apiKey: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_SECRET_KEY,
      options: { defaultType: "unified" },
    });
  }
  return g._exchange;
}

// ─── Рыночные данные ──────────────────────────────────────────────────────────

// Получить текущую цену и статистику за 24 часа
export async function getMarketData(symbol: string): Promise<MarketData> {
  const ex = getPublicExchange();
  const [ticker, candles1h] = await Promise.all([
    ex.fetchTicker(symbol),
    ex.fetchOHLCV(symbol, "1h", undefined, 2),
  ]);

  // Считаем изменение за последний час
  const priceChange1h =
    candles1h.length >= 2
      ? ((candles1h[1][4]! - candles1h[0][4]!) / candles1h[0][4]!) * 100
      : 0;

  return {
    symbol,
    price: ticker.last ?? 0,
    priceChange1h,
    priceChange24h: ticker.percentage ?? 0,
    volume24h: ticker.quoteVolume ?? 0,
    high24h: ticker.high ?? 0,
    low24h: ticker.low ?? 0,
    timestamp: Date.now(),
  };
}

// Получить исторические свечи для расчёта индикаторов
export async function getOHLCV(
  symbol: string,
  limit = 200,
): Promise<PricePoint[]> {
  const ex = getPublicExchange();
  const ohlcv = await ex.fetchOHLCV(symbol, "5m", undefined, limit);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return ohlcv.map(([time, , , , close, volume]) => ({
    time: time as number,
    price: close as number,
    volume: volume as number,
  }));
}

// ─── Торговые операции ────────────────────────────────────────────────────────

// Получить свободный баланс USDT
export async function getBalance(): Promise<number> {
  const ex = getExchange();
  const balance = await ex.fetchBalance({ type: "unified" });
  return balance.USDC?.free ?? 0;
}

// Получить свободный баланс конкретного токена (например "BTC")
export async function getTokenBalance(token: string): Promise<number> {
  const ex = getExchange();
  const balance = await ex.fetchBalance({ type: "unified" });
  return balance[token]?.free ?? 0;
}

// Купить по рыночной цене на указанную сумму в USDT
// Возвращает фактически купленное количество (с учётом комиссии)
export async function marketBuy(symbol: string, usdсAmount: number): Promise<number> {
  const ex = getExchange();
  const order = await ex.createMarketBuyOrderWithCost(symbol, usdсAmount);
  // order.filled — фактически исполненное количество base currency (BTC)
  return order.filled ?? order.amount ?? 0;
}

// Продать по рыночной цене указанное количество монет
export async function marketSell(symbol: string, amount: number) {
  const ex = getExchange();
  return await ex.createMarketSellOrder(symbol, amount);
}

// ─── Расчёт индикаторов ───────────────────────────────────────────────────────

export function calculateIndicators(candles: PricePoint[]): Indicators {
  const prices = candles.map((c) => c.price);
  const volumes = candles.map((c) => c.volume ?? 0);
  const currentPrice = prices[prices.length - 1];

  const ema20 = calculateEMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, 200);
  const { macd, signal, histogram } = calculateMACD(prices);
  const bollinger = calculateBollinger(prices, 20);

  // Средний объём за 20 периодов
  const volumeSMA = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];

  // Уровни поддержки и сопротивления — мин/макс за последние 20 свечей
  const recent20 = prices.slice(-20);
  const supportLevel = Math.min(...recent20);
  const resistanceLevel = Math.max(...recent20);

  // Тренд: цена выше обеих EMA = восходящий, ниже = нисходящий
  let trend: MarketTrend = "SIDEWAYS";
  if (currentPrice > ema20 && ema20 > ema50) trend = "UPTREND";
  else if (currentPrice < ema20 && ema20 < ema50) trend = "DOWNTREND";

  return {
    rsi14: calculateRSI(prices, 14),
    rsi7: calculateRSI(prices, 7),
    stochK: calculateStochastic(prices, 14).k,
    stochD: calculateStochastic(prices, 14).d,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    ema20,
    ema50,
    ema200,
    sma20: prices.slice(-20).reduce((a, b) => a + b) / 20,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    bollingerWidth:
      ((bollinger.upper - bollinger.lower) / bollinger.middle) * 100,
    atr: calculateATR(prices, 14),
    volumeSMA,
    volumeRatio: volumeSMA > 0 ? currentVolume / volumeSMA : 1,
    candlePattern: detectCandlePattern(prices),
    trend,
    supportLevel,
    resistanceLevel,
  };
}

// Получить индекс страха и жадности (публичный API — не требует ключа)
export async function getSentimentData(): Promise<SentimentData> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    const data = await res.json();
    const fng = data.data[0];

    return {
      fearAndGreedIndex: parseInt(fng.value),
      fearAndGreedLabel: fng.value_classification,
      btcDominance: 52, // TODO: подключить CoinGecko API
      marketCapChange24h: 0, // TODO: подключить CoinGecko API
      fundingRate: 0.01, // TODO: подключить Bybit Funding Rate API
      longShortRatio: 1.0, // TODO: подключить Bybit Long/Short API
    };
  } catch {
    // Fallback при недоступности API
    return {
      fearAndGreedIndex: 50,
      fearAndGreedLabel: "Neutral",
      btcDominance: 52,
      marketCapChange24h: 0,
      fundingRate: 0.01,
      longShortRatio: 1.0,
    };
  }
}

// ─── Математика индикаторов ───────────────────────────────────────────────────

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  let gains = 0,
    losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.9; // упрощённый расчёт сигнальной линии
  return { macd, signal, histogram: macd - signal };
}

function calculateBollinger(prices: number[], period: number) {
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b) / period;
  const variance =
    slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { middle, upper: middle + 2 * std, lower: middle - 2 * std };
}

function calculateATR(prices: number[], period: number): number {
  const trueRanges = [];
  for (let i = 1; i < prices.length; i++) {
    trueRanges.push(Math.abs(prices[i] - prices[i - 1]));
  }
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateStochastic(prices: number[], period: number) {
  const slice = prices.slice(-period);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const current = prices[prices.length - 1];
  const k = high === low ? 50 : ((current - low) / (high - low)) * 100;
  return { k, d: k * 0.9 }; // упрощённый расчёт %D
}

// Распознавание паттернов свечей по последним 3 ценам закрытия
function detectCandlePattern(prices: number[]): CandlePattern {
  if (prices.length < 3) return "NONE";
  const [prev2, prev1, curr] = prices.slice(-3);

  // Бычье поглощение — текущая свеча полностью поглощает предыдущую
  if (prev1 < prev2 && curr > prev2) return "ENGULFING_BULL";

  // Медвежье поглощение
  if (prev1 > prev2 && curr < prev2) return "ENGULFING_BEAR";

  // Молот — разворот после падения
  if (prev1 < prev2 && curr > prev1 && (curr - prev1) / (prev2 - prev1) > 0.5)
    return "HAMMER";

  // Падающая звезда — разворот после роста
  if (prev1 > prev2 && curr < prev1 && (prev1 - curr) / (prev1 - prev2) > 0.5)
    return "SHOOTING_STAR";

  return "NONE";
}
