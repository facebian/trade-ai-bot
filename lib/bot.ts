import { v4 as uuid } from "uuid";
import {
  BotState,
  Trade,
  Position,
  ClaudeAnalysis,
  TradingPair,
  NetworkMode,
} from "./types";
import {
  getMarketData,
  getOHLCV,
  calculateIndicators,
  getBalance,
  getSentimentData,
  marketBuy,
  marketSell,
  resetExchange,
} from "./exchange";
import { analyzeMarket } from "./claude";
import { getCryptoNews } from "./news";

// ─── Состояние бота ───────────────────────────────────────────────────────────
// Хранится на globalThis, чтобы быть общим для всех модульных инстансов
// Next.js App Router (каждый route handler получает свой скоуп модуля).
// В продакшене замени на Redis или PostgreSQL.

const gb = globalThis as typeof globalThis & {
  _botState: BotState;
  _botInterval: ReturnType<typeof setInterval> | null;
};

if (!gb._botState) {
  gb._botState = {
    status: "stopped",
    network: process.env.USE_TESTNET === "true" ? "testnet" : "mainnet",
    balance: 0,
    startBalance: 0,
    position: null,
    trades: [],
    totalPnl: 0,
    totalPnlPercent: 0,
    winRate: 0,
    lastAnalysis: null,
    lastError: null,
    lastUpdated: Date.now(),
  };
}
if (gb._botInterval === undefined) gb._botInterval = null;

// ─── Публичные функции управления ────────────────────────────────────────────

// Получить текущее состояние бота (используется в API роутах)
export function getBotState(): BotState {
  return { ...gb._botState };
}

// Синхронизировать баланс с биржей — вызывается из /api/bot/status каждые 5с
// Работает только когда бот остановлен, чтобы не дублировать запросы во время работы
export async function syncBalance(): Promise<void> {
  if (gb._botState.status === "running") return;
  try {
    const balance = await getBalance();
    gb._botState = { ...gb._botState, balance, lastError: null };
  } catch (error) {
    console.error("[syncBalance]", error);
    gb._botState = { ...gb._botState, lastError: `Balance fetch failed: ${String(error)}` };
  }
}

// Запустить бота — получаем баланс и запускаем цикл анализа
export async function startBot(): Promise<void> {
  if (gb._botState.status === "running") return;

  let balance: number;
  try {
    balance = await getBalance();
  } catch (error) {
    gb._botState = {
      ...gb._botState,
      status: "error",
      lastError: `Failed to fetch balance: ${String(error)}`,
      lastUpdated: Date.now(),
    };
    throw error;
  }

  gb._botState = {
    ...gb._botState,
    status: "running",
    balance,
    startBalance: balance,
    lastError: null,
    lastUpdated: Date.now(),
  };

  // Первый анализ сразу, затем каждые 30 секунд
  await runAnalysisCycle();
  gb._botInterval = setInterval(runAnalysisCycle, 30_000);
}

// Остановить бота
export function stopBot(): void {
  if (gb._botInterval) {
    clearInterval(gb._botInterval);
    gb._botInterval = null;
  }
  gb._botState = { ...gb._botState, status: "stopped", lastUpdated: Date.now() };
}

// Переключить сеть (testnet ↔ mainnet) — останавливает бота и сбрасывает состояние
export function setNetwork(network: NetworkMode): void {
  if (gb._botState.status === "running") stopBot();
  resetExchange(network === "testnet");
  gb._botState = {
    status: "stopped",
    network,
    balance: 0,
    startBalance: 0,
    position: null,
    trades: [],
    totalPnl: 0,
    totalPnlPercent: 0,
    winRate: 0,
    lastAnalysis: null,
    lastError: null,
    lastUpdated: Date.now(),
  };
}

// ─── Основной цикл анализа ────────────────────────────────────────────────────
// Вызывается каждые 30 секунд: собирает данные → спрашивает Claude → исполняет

async function runAnalysisCycle(): Promise<void> {
  const pair = (process.env.TRADING_PAIR ||
    TradingPair.BTC_USDT) as TradingPair;

  try {
    // 1. Собираем все данные параллельно для скорости
    const [marketData, candles, sentiment, news] = await Promise.all([
      getMarketData(pair),
      getOHLCV(pair, 200),
      getSentimentData(),
      getCryptoNews("BTC"),
    ]);

    // 2. Считаем технические индикаторы
    const indicators = calculateIndicators(candles);

    // 3. Обновляем P&L открытой позиции по текущей цене
    if (gb._botState.position) {
      const pnl =
        (marketData.price - gb._botState.position.entryPrice) *
        gb._botState.position.amount;
      const pnlPercent =
        ((marketData.price - gb._botState.position.entryPrice) /
          gb._botState.position.entryPrice) *
        100;
      gb._botState.position = {
        ...gb._botState.position,
        currentPrice: marketData.price,
        pnl,
        pnlPercent,
      };
    }

    // 4. Отправляем все данные в Claude — он принимает решение
    const analysis = await analyzeMarket({
      marketData,
      indicators,
      sentiment,
      news,
      position: gb._botState.position,
      recentTrades: gb._botState.trades.slice(0, 5),
      balance: gb._botState.balance,
      pair,
    });

    gb._botState.lastAnalysis = analysis;

    // 5. Исполняем решение Claude на бирже
    await executeDecision(analysis, marketData.price, pair);

    // 6. Пересчитываем статистику
    updateStats();

    gb._botState.lastError = null;
    gb._botState.lastUpdated = Date.now();
  } catch (error) {
    console.error("Bot cycle error:", error);
    gb._botState.status = "error";
    gb._botState.lastError = String(error);
    gb._botState.lastUpdated = Date.now();
  }
}

// ─── Исполнение торгового решения ─────────────────────────────────────────────

async function executeDecision(
  analysis: ClaudeAnalysis,
  currentPrice: number,
  pair: TradingPair,
): Promise<void> {
  const positionSize = Number(process.env.POSITION_SIZE) || 100; // USDT

  // BUY — открываем позицию если нет активной и хватает баланса
  if (
    analysis.decision === "BUY" &&
    !gb._botState.position &&
    gb._botState.balance >= positionSize
  ) {
    await marketBuy(pair, positionSize);

    const amount = positionSize / currentPrice;

    const trade: Trade = {
      id: uuid(),
      type: "BUY",
      pair,
      price: currentPrice,
      amount,
      total: positionSize,
      pnl: null, // P&L будет известен только после продажи
      pnlPercent: null,
      reasoning: analysis.reasoning,
      timestamp: Date.now(),
    };

    gb._botState.position = {
      pair,
      amount,
      entryPrice: currentPrice,
      currentPrice,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
    };

    gb._botState.balance -= positionSize;
    gb._botState.trades = [trade, ...gb._botState.trades];
  }

  // SELL — закрываем позицию если она есть
  else if (analysis.decision === "SELL" && gb._botState.position) {
    const { amount, entryPrice } = gb._botState.position;
    await marketSell(pair, amount);

    const proceeds = amount * currentPrice;
    const pnl = proceeds - amount * entryPrice;
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    const trade: Trade = {
      id: uuid(),
      type: "SELL",
      pair,
      price: currentPrice,
      amount,
      total: proceeds,
      pnl,
      pnlPercent,
      reasoning: analysis.reasoning,
      timestamp: Date.now(),
    };

    gb._botState.balance += proceeds;
    gb._botState.position = null;
    gb._botState.trades = [trade, ...gb._botState.trades];
  }

  // HOLD — ничего не делаем, просто логируем решение
}

// ─── Подсчёт статистики ───────────────────────────────────────────────────────

function updateStats(): void {
  // Общая стоимость = баланс + стоимость открытой позиции
  const totalValue =
    gb._botState.balance +
    (gb._botState.position
      ? gb._botState.position.amount * gb._botState.position.currentPrice
      : 0);

  gb._botState.totalPnl = totalValue - gb._botState.startBalance;
  gb._botState.totalPnlPercent =
    gb._botState.startBalance > 0
      ? (gb._botState.totalPnl / gb._botState.startBalance) * 100
      : 0;

  // Win rate — считаем только по закрытым сделкам SELL
  const closedTrades = gb._botState.trades.filter(
    (t: Trade) => t.type === "SELL" && t.pnl !== null,
  );
  const winningTrades = closedTrades.filter((t: Trade) => (t.pnl ?? 0) > 0);
  gb._botState.winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
}
