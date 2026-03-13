# TradeAI Bot — Architecture & Algorithmic Map

## Overview

TradeAI is an autonomous cryptocurrency trading bot with a real-time web dashboard. It connects to Bybit via the CCXT library, computes technical indicators locally, asks Claude AI for a trading decision, and executes orders — all on a 30-second loop.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · CCXT · Anthropic SDK

---

## High-Level Data Flow

```
Browser (Dashboard)
  │
  ├─ GET /api/bot/status  ──────────────────────────► lib/bot.ts
  │    polling every 5s                                 getBotState()
  │
  ├─ GET /api/price  ───────────────────────────────► lib/exchange.ts
  │    polling every 30s                                getMarketData() + getOHLCV()
  │
  ├─ POST /api/bot/start ──────────────────────────► lib/bot.ts  startBot()
  ├─ POST /api/bot/stop  ──────────────────────────► lib/bot.ts  stopBot()
  └─ POST /api/bot/mode  ──────────────────────────► lib/bot.ts  setNetwork()

Server (Node.js process)
  └─ setInterval(runAnalysisCycle, 30s)
       │
       ├─ Bybit API (via CCXT)   ← getMarketData(), getOHLCV()
       ├─ alternative.me API     ← getSentimentData() [Fear & Greed]
       ├─ CryptoCompare API      ← getCryptoNews()
       ├─ local math             ← calculateIndicators()
       └─ Anthropic API          ← analyzeMarket() → decision → executeDecision()
```

---

## Bot Lifecycle (lib/bot.ts)

```
startBot()
  │
  ├─ Guard: if already "running" → return
  ├─ getBalance()  ──► Bybit USDT free balance
  ├─ Set status = "running", startBalance = balance
  ├─ runAnalysisCycle()  ◄── immediately (first tick)
  └─ setInterval(runAnalysisCycle, 30_000ms)

stopBot()
  ├─ clearInterval()
  └─ Set status = "stopped"

setNetwork(network)          ← testnet / mainnet switcher
  ├─ stopBot() if running
  ├─ resetExchange(sandbox)  ← clears CCXT singleton, creates new instance
  └─ Reset all BotState to zero (clean slate for new network)
```

---

## Analysis Cycle (every 30 seconds)

```
runAnalysisCycle()
  │
  ├── 1. Parallel data fetch
  │     ├─ getMarketData(pair)   → price, 24h change, volume, high, low
  │     ├─ getOHLCV(pair, 200)   → last 200 × 15-minute candles
  │     ├─ getSentimentData()    → Fear & Greed index (alternative.me)
  │     └─ getCryptoNews("BTC")  → 5 latest headlines + sentiment
  │
  ├── 2. calculateIndicators(candles)
  │     ├─ RSI (14, 7)
  │     ├─ Stochastic %K / %D
  │     ├─ MACD (EMA12 − EMA26) + signal + histogram
  │     ├─ EMA (20, 50, 200) + SMA20
  │     ├─ Bollinger Bands (20-period, 2σ) + width
  │     ├─ ATR (14-period average true range)
  │     ├─ Volume ratio (current / SMA20)
  │     ├─ Candle pattern detection (last 3 closes)
  │     │     HAMMER · SHOOTING_STAR · ENGULFING_BULL · ENGULFING_BEAR · NONE
  │     ├─ Trend (UPTREND / DOWNTREND / SIDEWAYS via EMA20 vs EMA50)
  │     └─ Support / Resistance (min/max of last 20 candles)
  │
  ├── 3. Update open position P&L at current price
  │
  ├── 4. analyzeMarket()  →  Anthropic API  →  ClaudeAnalysis
  │     Input:  marketData + indicators + sentiment + news
  │             + current position + last 5 trades + balance
  │     Output: { decision, reasoning, confidence, suggestedSize,
  │               riskLevel, stopLoss, takeProfit, keyFactors }
  │
  ├── 5. executeDecision()
  │     BUY  → no open position + balance ≥ POSITION_SIZE
  │               marketBuy(pair, POSITION_SIZE USDT)
  │               record Trade (pnl = null until closed)
  │               open Position with stopLoss / takeProfit
  │     SELL → open position exists
  │               marketSell(pair, amount)
  │               calculate realized P&L
  │               record Trade with final pnl
  │               close Position
  │     HOLD → no action
  │
  └── 6. updateStats()
        totalPnl        = (balance + positionValue) − startBalance
        totalPnlPercent = totalPnl / startBalance × 100
        winRate         = winning SELLs / total SELLs × 100
```

---

## Claude AI Prompt Structure (lib/claude.ts)

The prompt sent to `claude-sonnet-4-20250514` contains five sections:

| Section | Content |
|---------|---------|
| MARKET DATA | Symbol, price, 1h/24h change, volume, high/low |
| TECHNICAL INDICATORS | All 18 indicators with human-readable annotations |
| MARKET SENTIMENT | Fear & Greed, BTC dominance, funding rate, long/short ratio |
| NEWS | Up to 5 headlines with POSITIVE / NEGATIVE / NEUTRAL label |
| PORTFOLIO | USDT balance, open position details, last 5 trades |

**Response format (strict JSON):**
```json
{
  "decision": "BUY | SELL | HOLD",
  "reasoning": "2–3 sentences in Russian",
  "confidence": 0–100,
  "suggestedSize": 0–100,
  "riskLevel": "LOW | MEDIUM | HIGH",
  "stopLoss": number | null,
  "takeProfit": number | null,
  "keyFactors": ["factor 1", "factor 2", "factor 3"]
}
```

---

## Exchange Layer (lib/exchange.ts)

- **Singleton pattern** — one `ccxt.bybit` instance per process, lazy-initialised on first call.
- **`resetExchange(sandbox)`** — clears the singleton so the next call creates a fresh instance with the new mode.
- **Testnet:** `sandbox: true` → connects to `testnet.bybit.com`
- **Mainnet:** `sandbox: false` → connects to `api.bybit.com`

---

## Network Mode Switching

```
User clicks badge in header
  │
  POST /api/bot/mode  { network: "testnet" | "mainnet" }
  │
  setNetwork(network)           lib/bot.ts
    ├─ stopBot()                 stop interval, status = "stopped"
    ├─ resetExchange(sandbox)    clear CCXT singleton
    └─ botState = clean slate    balance 0, no trades, no position
  │
  useBotData polls /api/bot/status  →  UI updates immediately
```

**State after switch:** the bot is stopped with a zeroed state. The user must press **Start** to fetch the new network's balance and begin trading.

---

## Frontend Architecture

```
app/page.tsx  ("use client")
  ├─ useBotData()     polls /api/bot/status every 5s
  │                   exposes: botState, startBot, stopBot, setNetwork, actionPending
  ├─ usePriceData()   polls /api/price every 30s
  │                   exposes: { marketData, candles }
  │
  ├─ <NetworkBadge>   testnet/mainnet toggle in header
  ├─ <StatsRow>       4 stat cards — balance, BTC price, trades, P&L
  ├─ <PriceChart>     recharts LineChart (100 × 15m candles)
  ├─ <AIPanel>        Claude decision + reasoning + open position + Start/Stop
  └─ <TradeHistory>   table of last 20 trades
```

---

## API Routes

| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| GET | `/api/bot/status` | `getBotState()` | Returns full BotState |
| POST | `/api/bot/start` | `startBot()` | Fetches balance, starts 30s loop |
| POST | `/api/bot/stop` | `stopBot()` | Stops loop |
| POST | `/api/bot/mode` | `setNetwork(network)` | Switches testnet ↔ mainnet |
| GET | `/api/price` | `getMarketData()` + `getOHLCV(100)` | Live price + chart data |

All routes use `force-dynamic` (no caching).

---

## State Management

BotState is a plain object stored as a module-level variable in `lib/bot.ts`. It is:
- **Mutated in-place** during the analysis cycle
- **Returned as a shallow copy** from `getBotState()` to prevent accidental external mutation
- **Lost on server restart** — for production persistence, replace with Redis or PostgreSQL

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `BYBIT_API_KEY` | ✅ | Bybit API key |
| `BYBIT_SECRET_KEY` | ✅ | Bybit secret key |
| `USE_TESTNET` | ✅ | `"true"` = testnet, `"false"` = mainnet (sets initial mode) |
| `TRADING_PAIR` | ✅ | e.g. `BTC/USDT` |
| `POSITION_SIZE` | ✅ | Size of each trade in USDT (e.g. `100`) |
| `CRYPTOCOMPARE_API_KEY` | ❌ | Optional — increases news API rate limit |
| `NEXT_PUBLIC_TRADING_PAIR` | ❌ | Shows trading pair label in the UI header |

---

## Known Limitations / TODOs

| # | Issue | Location |
|---|-------|----------|
| 1 | Bot state is in-memory — lost on restart | `lib/bot.ts` |
| 2 | `btcDominance`, `marketCapChange24h` are hardcoded | `lib/exchange.ts` `getSentimentData()` |
| 3 | `fundingRate`, `longShortRatio` are hardcoded | `lib/exchange.ts` `getSentimentData()` |
| 4 | MACD signal line is simplified (`macd × 0.9`) | `lib/exchange.ts` `calculateMACD()` |
| 5 | Stochastic %D is simplified (`%K × 0.9`) | `lib/exchange.ts` `calculateStochastic()` |
| 6 | No stop-loss / take-profit auto-execution | `lib/bot.ts` `runAnalysisCycle()` |
| 7 | Single trading pair at a time | `lib/bot.ts` |
| 8 | No rate-limit handling for Bybit API | `lib/exchange.ts` |
