import { v4 as uuid } from "uuid";
import { BotState, Trade, ClaudeAnalysis, TradingPair } from "./types";
import { supabase } from "./supabase";
import {
  getMarketData,
  getOHLCV,
  calculateIndicators,
  getBalance,
  getTokenBalance,
  getSentimentData,
  marketBuy,
  marketSell,
} from "./exchange";
import { analyzeMarket } from "./claude";
import { getCryptoNews } from "./news";
import { logTrade } from "./logger";

// ─── Состояние бота ───────────────────────────────────────────────────────────
// Хранится на globalThis + персистируется в Supabase (таблица bot_state).
// globalThis — кеш для текущего инстанса; Supabase — источник правды между инстансами.

const BOT_STATE_ROW_ID = "singleton";

const DEFAULT_BOT_STATE: BotState = {
  status: "stopped",
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

const gb = globalThis as typeof globalThis & {
  _botState: BotState;
  _botInterval: ReturnType<typeof setInterval> | null;
  _botStateLoaded: boolean;
  _analysisCycleRunning: boolean;
};

if (!gb._botState) gb._botState = { ...DEFAULT_BOT_STATE };
if (gb._botInterval === undefined) gb._botInterval = null;
if (gb._botStateLoaded === undefined) gb._botStateLoaded = false;
if (gb._analysisCycleRunning === undefined) gb._analysisCycleRunning = false;

// ─── Supabase persistence ─────────────────────────────────────────────────────

// Загружает state из Supabase при холодном старте инстанса (один раз на инстанс)
async function ensureStateLoaded(): Promise<void> {
  if (gb._botStateLoaded) return;
  gb._botStateLoaded = true; // set early to prevent concurrent loads
  try {
    const { data } = await supabase
      .from("bot_state")
      .select("*")
      .eq("id", BOT_STATE_ROW_ID)
      .single();

    if (data) {
      gb._botState = {
        status: data.status,
        balance: Number(data.balance),
        startBalance: Number(data.start_balance),
        position: data.position ?? null,
        trades: data.trades ?? [],
        totalPnl: Number(data.total_pnl),
        totalPnlPercent: Number(data.total_pnl_percent),
        winRate: Number(data.win_rate),
        lastAnalysis: data.last_analysis ?? null,
        lastError: data.last_error ?? null,
        lastUpdated: Number(data.last_updated),
      };

      // Cold start: if DB says running but no interval → restart analysis loop
      if (gb._botState.status === "running" && !gb._botInterval) {
        const { data: config } = await supabase
          .from("bot_config")
          .select("analysis_interval_min")
          .single();
        const intervalMs = (config?.analysis_interval_min ?? 5) * 60_000;
        gb._botInterval = setInterval(runAnalysisCycle, intervalMs);
      }
    }
  } catch (error) {
    console.error("[ensureStateLoaded]", error);
    // Keep default state on error
  }
}

// Сохраняет текущий state в Supabase (best-effort, не бросает)
async function persistState(): Promise<void> {
  try {
    await supabase.from("bot_state").upsert({
      id: BOT_STATE_ROW_ID,
      status: gb._botState.status,
      balance: gb._botState.balance,
      start_balance: gb._botState.startBalance,
      position: gb._botState.position,
      trades: gb._botState.trades,
      total_pnl: gb._botState.totalPnl,
      total_pnl_percent: gb._botState.totalPnlPercent,
      win_rate: gb._botState.winRate,
      last_analysis: gb._botState.lastAnalysis,
      last_error: gb._botState.lastError,
      last_updated: gb._botState.lastUpdated,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[persistState]", error);
  }
}

// ─── Публичные функции управления ────────────────────────────────────────────

// Получить текущее состояние бота
export async function getBotState(): Promise<BotState> {
  await ensureStateLoaded();
  return { ...gb._botState };
}

// Синхронизировать баланс с биржей — вызывается из /api/bot/status каждые 5с
export async function syncBalance(): Promise<void> {
  await ensureStateLoaded();
  if (gb._botState.status === "running") return;
  try {
    const balance = await getBalance();
    gb._botState = { ...gb._botState, balance, lastError: null };
    await persistState();
  } catch (error) {
    console.error("[syncBalance]", error);
    gb._botState = {
      ...gb._botState,
      lastError: `Balance fetch failed: ${String(error)}`,
    };
    await persistState();
  }
}

// Запустить бота
export async function startBot(): Promise<void> {
  await ensureStateLoaded();
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
    await persistState();
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
  await persistState();

  // Читаем интервал анализа из конфига БД, fallback — 5 минут
  const { data: config } = await supabase
    .from("bot_config")
    .select("analysis_interval_min")
    .single();
  const intervalMs = (config?.analysis_interval_min ?? 5) * 60_000;

  // Первый анализ сразу, затем по интервалу из конфига
  await runAnalysisCycle();
  gb._botInterval = setInterval(runAnalysisCycle, intervalMs);
}

// Остановить бота
export async function stopBot(): Promise<void> {
  if (gb._botInterval) {
    clearInterval(gb._botInterval);
    gb._botInterval = null;
  }
  gb._botState = {
    ...gb._botState,
    status: "stopped",
    lastUpdated: Date.now(),
  };
  await persistState();
}

// Принудительно закрыть текущую позицию по рыночной цене
export async function closePosition(): Promise<void> {
  const position = gb._botState.position;
  if (!position) return;

  const pair = position.pair as TradingPair;
  const baseToken = pair.split("/")[0];
  const actualAmount = await getTokenBalance(baseToken);
  const sellAmount = actualAmount > 0 ? actualAmount : position.amount;
  await marketSell(pair, sellAmount);

  const currentPrice = position.currentPrice;
  const proceeds = position.amount * currentPrice;
  const pnl = proceeds - position.amount * position.entryPrice;
  const pnlPercent =
    ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

  const trade: Trade = {
    id: uuid(),
    type: "SELL",
    pair,
    price: currentPrice,
    amount: position.amount,
    total: proceeds,
    pnl,
    pnlPercent,
    reasoning: "Manual close by user",
    timestamp: Date.now(),
  };

  gb._botState.balance += proceeds;
  gb._botState.position = null;
  gb._botState.trades = [trade, ...gb._botState.trades];

  logTrade({
    type: "SELL",
    pair,
    price: currentPrice,
    amount: position.amount,
    total: proceeds,
    pnl,
    pnlPercent,
    reasoning: "Manual close by user",
  });
  updateStats();
  gb._botState.lastUpdated = Date.now();
  await persistState();
}

// ─── Основной цикл анализа ────────────────────────────────────────────────────
// Вызывается по setInterval (локально) или Vercel Cron (продакшн)

export async function runAnalysisCycle(): Promise<void> {
  // Предотвращаем одновременные запуски (например, cron + setInterval)
  if (gb._analysisCycleRunning) return;
  gb._analysisCycleRunning = true;

  // Убеждаемся что state загружен (важно для cron, который всегда cold start)
  await ensureStateLoaded();

  if (gb._botState.status !== "running") {
    gb._analysisCycleRunning = false;
    return;
  }

  const pair = (process.env.TRADING_PAIR || TradingPair.BTC_USDT) as TradingPair;

  try {
    const [marketData, candles, sentiment, news] = await Promise.all([
      getMarketData(pair),
      getOHLCV(pair, 200),
      getSentimentData(),
      getCryptoNews("BTC"),
    ]);

    const indicators = calculateIndicators(candles);

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

    await executeDecision(analysis, marketData.price, pair);

    updateStats();

    gb._botState.lastError = null;
    gb._botState.lastUpdated = Date.now();
    await persistState();
  } catch (error) {
    console.error("Bot cycle error:", error);
    gb._botState.status = "error";
    gb._botState.lastError = String(error);
    gb._botState.lastUpdated = Date.now();
    await persistState();
  } finally {
    gb._analysisCycleRunning = false;
  }
}

// ─── Исполнение торгового решения ─────────────────────────────────────────────

async function executeDecision(
  analysis: ClaudeAnalysis,
  currentPrice: number,
  pair: TradingPair,
): Promise<void> {
  const positionSize = Number(process.env.POSITION_SIZE) || 5;

  if (
    analysis.decision === "BUY" &&
    !gb._botState.position &&
    gb._botState.balance >= positionSize
  ) {
    const amount = await marketBuy(pair, positionSize);

    const trade: Trade = {
      id: uuid(),
      type: "BUY",
      pair,
      price: currentPrice,
      amount,
      total: positionSize,
      pnl: null,
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

    logTrade({
      type: "BUY",
      pair,
      price: currentPrice,
      amount,
      total: positionSize,
      reasoning: analysis.reasoning,
    });
  } else if (analysis.decision === "SELL" && gb._botState.position) {
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

    logTrade({
      type: "SELL",
      pair,
      price: currentPrice,
      amount,
      total: proceeds,
      pnl,
      pnlPercent,
      reasoning: analysis.reasoning,
    });
  }
}

// ─── Подсчёт статистики ───────────────────────────────────────────────────────

function updateStats(): void {
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

  const closedTrades = gb._botState.trades.filter(
    (t: Trade) => t.type === "SELL" && t.pnl !== null,
  );
  const winningTrades = closedTrades.filter((t: Trade) => (t.pnl ?? 0) > 0);
  gb._botState.winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
}
