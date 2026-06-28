export interface ForexIndicators {
  currentPrice: number;
  prevPrice: number;
  changePercent: number;
  rsi14: number;
  ema9: number;
  ema21: number;
  sma50: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPercent: number; // 0 = lower band, 100 = upper band
  stochK: number;
  stochD: number;
  roc10: number; // 10-day rate of change %
}

function calcEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  let prev = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [prev];
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function calcSMA(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calcSMAArr(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);

  // Wilder's initial average
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for subsequent values
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcMACD(prices: number[]) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  if (!ema12.length || !ema26.length) return { macd: 0, signal: 0, histogram: 0 };

  // ema12 starts at index 11, ema26 at index 25 → offset = 14
  const macdLine = ema26.map((v, i) => ema12[i + 14] - v);
  const signalLine = calcEMA(macdLine, 9);

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1] ?? 0;
  return { macd: lastMacd, signal: lastSignal, histogram: lastMacd - lastSignal };
}

function calcBollingerBands(prices: number[], period = 20, mult = 2) {
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = mid + mult * sd;
  const lower = mid - mult * sd;
  const cur = prices[prices.length - 1];
  const pct = upper !== lower ? ((cur - lower) / (upper - lower)) * 100 : 50;
  return { upper, middle: mid, lower, percent: Math.max(0, Math.min(100, pct)) };
}

function calcStochastic(prices: number[], period = 14, smooth = 3) {
  if (prices.length < period) return { k: 50, d: 50 };
  const rawK: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const hi = Math.max(...slice), lo = Math.min(...slice);
    rawK.push(hi !== lo ? ((prices[i] - lo) / (hi - lo)) * 100 : 50);
  }
  const smoothedK = calcSMAArr(rawK, smooth);
  const smoothedD = calcSMAArr(smoothedK, smooth);
  return {
    k: smoothedK[smoothedK.length - 1] ?? 50,
    d: smoothedD[smoothedD.length - 1] ?? 50,
  };
}

export function calculateForexIndicators(prices: number[]): ForexIndicators | null {
  if (prices.length < 30) return null;

  const cur = prices[prices.length - 1];
  const prev = prices[prices.length - 2];
  const ema9 = calcEMA(prices, 9);
  const ema21 = calcEMA(prices, 21);
  const bb = calcBollingerBands(prices);
  const { macd, signal: macdSignal, histogram: macdHistogram } = calcMACD(prices);
  const { k: stochK, d: stochD } = calcStochastic(prices);
  const roc10Price = prices[prices.length - 11];

  return {
    currentPrice: cur,
    prevPrice: prev,
    changePercent: ((cur - prev) / prev) * 100,
    rsi14: calcRSI(prices),
    ema9: ema9[ema9.length - 1],
    ema21: ema21[ema21.length - 1],
    sma50: prices.length >= 50 ? calcSMA(prices, 50) : calcSMA(prices, prices.length),
    macd,
    macdSignal,
    macdHistogram,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    bbPercent: bb.percent,
    stochK,
    stochD,
    roc10: roc10Price ? ((cur - roc10Price) / roc10Price) * 100 : 0,
  };
}
