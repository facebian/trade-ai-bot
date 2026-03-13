// ─── Базовые типы ───────────────────────────────────────────────────────────

export type TradingPair = "BTC/USDT" | "ETH/USDT" | "SOL/USDT";
export type Decision = "BUY" | "SELL" | "HOLD";
export type BotStatus = "running" | "stopped" | "error";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type CandlePattern =
  | "HAMMER"
  | "SHOOTING_STAR"
  | "DOJI"
  | "ENGULFING_BULL"
  | "ENGULFING_BEAR"
  | "NONE";
export type MarketTrend = "UPTREND" | "DOWNTREND" | "SIDEWAYS";

// ─── Рыночные данные с биржи ─────────────────────────────────────────────────

export interface MarketData {
  symbol: string;
  price: number;
  priceChange1h: number; // Изменение цены за 1 час в %
  priceChange24h: number; // Изменение цены за 24 часа в %
  volume24h: number; // Объём торгов за 24 часа в USDT
  high24h: number; // Максимум за 24 часа
  low24h: number; // Минимум за 24 часа
  timestamp: number;
}

// ─── Технические индикаторы ──────────────────────────────────────────────────

export interface Indicators {
  // Осцилляторы — показывают перекупленность/перепроданность
  rsi14: number; // RSI 14 периодов (0-100). < 30 = перепродан, > 70 = перекуплен
  rsi7: number; // RSI 7 периодов — более чувствительный к краткосрочным движениям
  stochK: number; // Stochastic %K (0-100)
  stochD: number; // Stochastic %D — сигнальная линия стохастика

  // MACD — показывает направление и силу тренда
  macd: number; // MACD линия (EMA12 - EMA26)
  macdSignal: number; // Сигнальная линия
  macdHistogram: number; // Гистограмма (macd - signal). > 0 = бычий импульс

  // EMA/SMA — скользящие средние для определения тренда
  ema20: number; // Краткосрочный тренд
  ema50: number; // Среднесрочный тренд
  ema200: number; // Долгосрочный тренд (цена выше = бычий рынок)
  sma20: number; // Простая скользящая средняя 20 периодов

  // Bollinger Bands — показывают волатильность и уровни цены
  bollingerUpper: number; // Верхняя полоса (сопротивление)
  bollingerMiddle: number; // Средняя полоса (SMA20)
  bollingerLower: number; // Нижняя полоса (поддержка)
  bollingerWidth: number; // Ширина полос в % — чем меньше, тем ближе пробой

  // Объём и волатильность
  atr: number; // Average True Range — средний диапазон свечи (волатильность)
  volumeSMA: number; // Средний объём за 20 периодов
  volumeRatio: number; // Текущий объём / средний объём. > 1.5 = аномальный объём

  // Паттерны и тренд
  candlePattern: CandlePattern; // Распознанный паттерн свечей
  trend: MarketTrend; // Текущий тренд
  supportLevel: number; // Ближайший уровень поддержки
  resistanceLevel: number; // Ближайший уровень сопротивления
}

// ─── Сентимент рынка ─────────────────────────────────────────────────────────

export interface SentimentData {
  fearAndGreedIndex: number; // 0-100. 0 = extreme fear, 100 = extreme greed
  fearAndGreedLabel: string; // Текстовое описание индекса
  btcDominance: number; // Доминация BTC в % от общей капитализации
  marketCapChange24h: number; // Изменение общей капитализации крипторынка за 24ч
  fundingRate: number; // Ставка финансирования фьючерсов. > 0.05 = перегрев лонгов
  longShortRatio: number; // Соотношение лонгов к шортам. > 1.5 = много лонгов
}

// ─── Новость ─────────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  hoursAgo: number;
}

// ─── Решение Claude AI ────────────────────────────────────────────────────────

export interface ClaudeAnalysis {
  decision: Decision;
  reasoning: string; // Объяснение решения на русском
  confidence: number; // Уверенность 0-100
  suggestedSize: number; // Рекомендуемый размер позиции в % от баланса
  riskLevel: RiskLevel;
  stopLoss: number | null; // Цена стоп-лосса (null если не нужен)
  takeProfit: number | null; // Цена тейк-профита (null если не нужен)
  keyFactors: string[]; // Ключевые факторы принятого решения
}

// ─── Сделка ──────────────────────────────────────────────────────────────────

export interface Trade {
  id: string;
  type: "BUY" | "SELL";
  pair: TradingPair;
  price: number;
  amount: number; // Количество BTC
  total: number; // Сумма в USDT
  pnl: number | null; // Прибыль/убыток (null пока позиция открыта)
  pnlPercent: number | null;
  reasoning: string; // Почему Claude принял это решение
  timestamp: number;
}

// ─── Открытая позиция ────────────────────────────────────────────────────────

export interface Position {
  pair: TradingPair;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

// ─── Полное состояние бота ────────────────────────────────────────────────────

export interface BotState {
  status: BotStatus;
  balance: number; // Текущий баланс USDT
  startBalance: number; // Начальный баланс (для подсчёта P&L)
  position: Position | null;
  trades: Trade[];
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number; // Процент прибыльных сделок
  lastAnalysis: ClaudeAnalysis | null;
  lastUpdated: number;
}

// ─── Запрос к Claude ─────────────────────────────────────────────────────────

export interface ClaudeRequest {
  marketData: MarketData;
  indicators: Indicators;
  sentiment: SentimentData;
  news: NewsItem[];
  position: Position | null;
  recentTrades: Trade[];
  balance: number;
  pair: TradingPair;
}

// ─── Точка на графике ────────────────────────────────────────────────────────

export interface PricePoint {
  time: number;
  price: number;
  volume?: number;
}
