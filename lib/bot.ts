import { v4 as uuid } from "uuid";
import {
  BotState,
  Trade,
  Position,
  ClaudeAnalysis,
  TradingPair,
} from "./types";
import {
  getMarketData,
  getOHLCV,
  calculateIndicators,
  getBalance,
  getSentimentData,
  marketBuy,
  marketSell,
} from "./exchange";
import { analyzeMarket } from "./claude";
import { getCryptoNews } from "./news";

// ─── Состояние бота ───────────────────────────────────────────────────────────
// Хранится в памяти сервера. В продакшене замени на Redis или PostgreSQL.

let botState: BotState = {
  status: "stopped",
  balance: 0,
  startBalance: 0,
  position: null,
  trades: [],
  totalPnl: 0,
  totalPnlPercent: 0,
  winRate: 0,
  lastAnalysis: null,
  lastUpdated: Date.now(),
};

let botInterval: ReturnType<typeof setInterval> | null = null;

// ─── Публичные функции управления ────────────────────────────────────────────

// Получить текущее состояние бота (используется в API роутах)
export function getBotState(): BotState {
  return { ...botState };
}

// Запустить бота — получаем баланс и запускаем цикл анализа
export async function startBot(): Promise<void> {
  if (botState.status === "running") return;

  const balance = await getBalance();

  botState = {
    ...botState,
    status: "running",
    balance,
    startBalance: balance,
    lastUpdated: Date.now(),
  };

  // Первый анализ сразу, затем каждые 30 секунд
  await runAnalysisCycle();
  botInterval = setInterval(runAnalysisCycle, 30_000);
}

// Остановить бота
export function stopBot(): void {
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
  }
  botState = { ...botState, status: "stopped", lastUpdated: Date.now() };
}

// ─── Основной цикл анализа ────────────────────────────────────────────────────
// Вызывается каждые 30 секунд: собирает данные → спрашивает Claude → исполняет

async function runAnalysisCycle(): Promise<void> {
  const pair = (process.env.TRADING_PAIR || "BTC/USDT") as TradingPair;

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
    if (botState.position) {
      const pnl =
        (marketData.price - botState.position.entryPrice) *
        botState.position.amount;
      const pnlPercent =
        ((marketData.price - botState.position.entryPrice) /
          botState.position.entryPrice) *
        100;
      botState.position = {
        ...botState.position,
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
      position: botState.position,
      recentTrades: botState.trades.slice(0, 5),
      balance: botState.balance,
      pair,
    });

    botState.lastAnalysis = analysis;

    // 5. Исполняем решение Claude на бирже
    await executeDecision(analysis, marketData.price, pair);

    // 6. Пересчитываем статистику
    updateStats();

    botState.lastUpdated = Date.now();
  } catch (error) {
    console.error("Bot cycle error:", error);
    botState.status = "error";
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
    !botState.position &&
    botState.balance >= positionSize
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

    botState.position = {
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

    botState.balance -= positionSize;
    botState.trades = [trade, ...botState.trades];
  }

  // SELL — закрываем позицию если она есть
  else if (analysis.decision === "SELL" && botState.position) {
    const { amount, entryPrice } = botState.position;
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

    botState.balance += proceeds;
    botState.position = null;
    botState.trades = [trade, ...botState.trades];
  }

  // HOLD — ничего не делаем, просто логируем решение
}

// ─── Подсчёт статистики ───────────────────────────────────────────────────────

function updateStats(): void {
  // Общая стоимость = баланс + стоимость открытой позиции
  const totalValue =
    botState.balance +
    (botState.position
      ? botState.position.amount * botState.position.currentPrice
      : 0);

  botState.totalPnl = totalValue - botState.startBalance;
  botState.totalPnlPercent = (botState.totalPnl / botState.startBalance) * 100;

  // Win rate — считаем только по закрытым сделкам SELL
  const closedTrades = botState.trades.filter(
    (t) => t.type === "SELL" && t.pnl !== null,
  );
  const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  botState.winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
}
