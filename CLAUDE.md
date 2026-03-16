# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
npm start        # Start production server
```

To add shadcn/ui components:

```bash
/opt/homebrew/bin/node ./node_modules/.bin/shadcn add <component-name> --yes
```

> Note: `npx` is not in PATH in this environment — use the full node path above.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui

**Key dependencies:** `@anthropic-ai/sdk`, `ccxt` (Bybit exchange), `recharts` (charts), `uuid`, `@tabler/icons-react`, `swr` (data fetching), `@supabase/supabase-js` (database)

**Key conventions:**

- `app/` — Next.js App Router pages and layouts
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge) for conditional class merging; use everywhere for className composition
- `@/*` path alias maps to the project root
- All trading pairs use USDC as quote currency (e.g. `BTC/USDC`, not `BTC/USDT`)

**UI system:** shadcn/ui with `radix-nova` style preset, Tabler icons (`@tabler/icons-react`), OKLCH-based CSS variables in `app/globals.css`. Dark mode is CSS-variable-driven.

**Tailwind v4** — uses `@tailwindcss/postcss` plugin (no `tailwind.config.js`). Theme extensions go in `globals.css` via `@theme`.

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Main trading dashboard |
| `/settings` | `app/settings/page.tsx` | Bot config form (trading pair, position size, Claude model, etc.) |

## Bot Architecture

Core modules in `lib/`:

| File | Responsibility |
|------|---------------|
| `lib/types.ts` | All shared TypeScript types (`BotState`, `Trade`, `Position`, `ClaudeAnalysis`, `Indicators`, etc.) |
| `lib/bot.ts` | Bot lifecycle (`startBot`, `stopBot`, `closePosition`, `getBotState`); runs analysis cycle every **5 minutes** via `setInterval`; bot state stored on `globalThis` (shared across Next.js route handler modules) |
| `lib/exchange.ts` | Bybit integration via `ccxt`; public + private exchange instances on `globalThis`; fetches market data, OHLCV candles (`5m` timeframe), account balance; executes market buy/sell orders; calculates all technical indicators (RSI, EMA, MACD, Bollinger Bands, ATR, Stochastic) |
| `lib/claude.ts` | Sends market data + indicators + sentiment + news to Claude; model configured via `bot_config.claude_model` (default: `claude-haiku-4-5-20251001`); parses JSON trading decision (`BUY`/`SELL`/`HOLD`) |
| `lib/news.ts` | Fetches crypto news from CryptoCompare API; keyword-based sentiment detection |
| `lib/supabase.ts` | Supabase client singleton |

**Analysis cycle flow:** `getMarketData` + `getOHLCV` + `getSentimentData` + `getCryptoNews` → `calculateIndicators` → `analyzeMarket` (Claude) → `executeDecision` (buy/sell on Bybit) → `updateStats`

**Trading pairs:** `BTC/USDC`, `ETH/USDC`, `SOL/USDC` — configured via `bot_config` table in DB

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/bot/status` | Returns current `BotState`; also calls `syncBalance()` when bot is stopped |
| `POST` | `/api/bot/start` | Starts the bot |
| `POST` | `/api/bot/stop` | Stops the bot |
| `POST` | `/api/bot/close` | Force-closes the open position at market price |
| `GET` | `/api/config` | Returns current `bot_config` row from Supabase |
| `GET` | `/api/price` | Returns latest market data + OHLCV candles for the chart |

## Hooks

| Hook | Description |
|------|-------------|
| `hooks/useBotData.ts` | Polls `/api/bot/status` every 5s; exposes `botState`, `startBot`, `stopBot`, `closePosition`, `actionPending` |
| `hooks/useConfig.ts` | SWR hook for `/api/config`; `refreshInterval: 60s`, `revalidateOnFocus: true`; call `mutateConfig()` after saving to instantly update cache |
| `hooks/usePriceData.ts` | Polls `/api/price` for chart data |
| `hooks/useCurrencyRates.ts` | Fetches currency exchange rates |

## Database (Supabase)

Table: `bot_config` — single-row config for the bot.

```sql
create table bot_config (
  id                    uuid        primary key default gen_random_uuid(),
  trading_pair          text        not null default 'BTC/USDC',
  position_size         numeric     not null default 10,
  candle_timeframe      text        not null default '5m',
  analysis_interval_min integer     not null default 5,
  stop_loss_pct         numeric,
  take_profit_pct       numeric,
  min_confidence        integer     not null default 60,
  claude_model          text        not null default 'claude-haiku-4-5-20251001',
  is_active             boolean     not null default false,
  updated_at            timestamptz not null default now()
);
insert into bot_config default values;
```

Config is read via `app/actions/config.ts` (server actions) and `app/api/config/route.ts` (GET endpoint for SWR).

## Environment Variables

```
ANTHROPIC_API_KEY               # Required — Claude API key
BYBIT_API_KEY                   # Required — Bybit mainnet API key (api.bybit.com)
BYBIT_SECRET_KEY                # Required — Bybit mainnet secret key
NEXT_PUBLIC_SUPABASE_URL        # Required — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Required — Supabase anon key
CRYPTOCOMPARE_API_KEY           # Optional — crypto news, up to 100k req/month free
NEXT_PUBLIC_TRADING_PAIR        # Optional — shown in UI header (e.g. BTC/USDC)
```

## Known TODOs

- `lib/exchange.ts`: `btcDominance`, `marketCapChange24h`, `fundingRate`, `longShortRatio` in `getSentimentData()` return hardcoded values — need CoinGecko and Bybit Funding Rate APIs
- Bot state is in-memory on `globalThis` — loses data on server restart; should be persisted to Supabase
- `lib/bot.ts` still reads `TRADING_PAIR` and `POSITION_SIZE` from env vars — should read from `bot_config` table instead
- `lib/claude.ts` model is hardcoded as fallback — should read from `bot_config.claude_model`
---
name: dzengi-api
description: Full Dzengi.com exchange API reference — use when implementing, debugging, or explaining Dzengi REST/WebSocket integrations, endpoints, authentication, or signature logic
---

# Dzengi.com Exchange API Reference

## Authentication

All private endpoints require HMAC-SHA256 signed requests.

**Headers:**
```
X-MBX-APIKEY: <your_api_key>
Content-Type: application/x-www-form-urlencoded   (for POST)
```

**Signature generation:**
1. Build the query string / body (e.g. `symbol=BTCUSDC&timestamp=1234567890`)
2. HMAC-SHA256 sign the full string with your **secret key**
3. Append `&signature=<hex_digest>` to the params

**Required params for all signed requests:**
- `timestamp` — Unix milliseconds (server time from `/api/v1/time`)
- `recvWindow` — optional, default 5000 ms

**TypeScript signing helper:**
```typescript
import crypto from "crypto";

export function signQuery(params: Record<string, string | number>, secret: string): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const sig = crypto.createHmac("sha256", secret).update(qs).digest("hex");
  return `${qs}&signature=${sig}`;
}
```

**WebSocket signature:** params must be **sorted alphabetically** before concatenation.

---

## Base URLs

| Environment | REST Base URL |
|-------------|---------------|
| Production  | `https://api.dzengi.com` |
| Demo/Testnet | `https://demo-api.dzengi.com` |

WebSocket: `wss://api.dzengi.com/v1/api/stream` (prod), `wss://demo-api.dzengi.com/v1/api/stream` (demo)

---

## REST Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/time` | Server time (`{ serverTime: number }`) |
| GET | `/api/v1/exchangeInfo` | Exchange info, trading pairs, rules |
| GET | `/api/v1/depth` | Order book (`symbol`, `limit`) |
| GET | `/api/v1/trades` | Recent trades (`symbol`, `limit`) |
| GET | `/api/v1/historicalTrades` | Historical trades (`symbol`, `limit`, `fromId`) |
| GET | `/api/v1/aggTrades` | Aggregated trades |
| GET | `/api/v1/klines` | Candlestick data (`symbol`, `interval`, `startTime`, `endTime`, `limit`) |
| GET | `/api/v1/ticker/24hr` | 24h price statistics (`symbol` optional) |
| GET | `/api/v1/ticker/price` | Latest price (`symbol` optional) |
| GET | `/api/v1/ticker/bookTicker` | Best bid/ask (`symbol` optional) |

**Kline intervals:** `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

### Private — Account

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/account` | Account info, balances (signed) |
| GET | `/api/v1/myTrades` | Trade history (`symbol`, `limit`, `fromId`) (signed) |

### Private — Orders

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/order` | Place new order (signed) |
| DELETE | `/api/v1/order` | Cancel order (signed) |
| GET | `/api/v1/order` | Query order status (signed) |
| GET | `/api/v1/openOrders` | All open orders (`symbol` optional) (signed) |
| DELETE | `/api/v1/openOrders` | Cancel all open orders for symbol (signed) |
| GET | `/api/v1/allOrders` | All orders (open, cancelled, filled) (signed) |

**Order params:**
```
symbol        BTCUSDC
side          BUY | SELL
type          LIMIT | MARKET | STOP_LOSS | STOP_LOSS_LIMIT | TAKE_PROFIT | TAKE_PROFIT_LIMIT | LIMIT_MAKER
timeInForce   GTC | IOC | FOK  (required for LIMIT)
quantity      decimal
price         decimal  (required for LIMIT)
stopPrice     decimal  (required for STOP_LOSS / TAKE_PROFIT)
newClientOrderId  string (optional, your custom ID)
newOrderRespType  ACK | RESULT | FULL
timestamp     ms
recvWindow    ms (optional)
```

---

## TypeScript Client Skeleton

```typescript
import crypto from "crypto";

const BASE_URL = process.env.DZENGI_DEMO === "true"
  ? "https://demo-api.dzengi.com"
  : "https://api.dzengi.com";
const API_KEY = process.env.DZENGI_API_KEY!;
const SECRET = process.env.DZENGI_SECRET_KEY!;

function sign(params: Record<string, string | number>): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const sig = crypto.createHmac("sha256", SECRET).update(qs).digest("hex");
  return `${qs}&signature=${sig}`;
}

async function publicGet(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${BASE_URL}${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Dzengi ${path}: ${res.status}`);
  return res.json();
}

async function privateGet(path: string, params: Record<string, string | number> = {}) {
  const signed = sign({ ...params, timestamp: Date.now() });
  const res = await fetch(`${BASE_URL}${path}?${signed}`, {
    headers: { "X-MBX-APIKEY": API_KEY },
  });
  if (!res.ok) throw new Error(`Dzengi ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function privatePost(path: string, params: Record<string, string | number> = {}) {
  const body = sign({ ...params, timestamp: Date.now() });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-MBX-APIKEY": API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Dzengi ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Public ───────────────────────────────────────────────────────────────────
export const getServerTime = () => publicGet("/api/v1/time");
export const getTicker = (symbol: string) => publicGet("/api/v1/ticker/24hr", { symbol });
export const getPrice = (symbol: string) => publicGet("/api/v1/ticker/price", { symbol });
export const getKlines = (symbol: string, interval = "5m", limit = 100) =>
  publicGet("/api/v1/klines", { symbol, interval, limit });
export const getOrderBook = (symbol: string, limit = 20) =>
  publicGet("/api/v1/depth", { symbol, limit });

// ── Private ──────────────────────────────────────────────────────────────────
export const getAccount = () => privateGet("/api/v1/account");
export const getOpenOrders = (symbol?: string) =>
  privateGet("/api/v1/openOrders", symbol ? { symbol } : {});
export const getMyTrades = (symbol: string, limit = 50) =>
  privateGet("/api/v1/myTrades", { symbol, limit });

export const placeOrder = (
  symbol: string,
  side: "BUY" | "SELL",
  type: "MARKET" | "LIMIT",
  quantity: number,
  price?: number
) =>
  privatePost("/api/v1/order", {
    symbol,
    side,
    type,
    quantity,
    ...(type === "LIMIT" && price ? { price, timeInForce: "GTC" } : {}),
  });

export const cancelOrder = (symbol: string, orderId: number) =>
  privateDelete("/api/v1/order", { symbol, orderId });

async function privateDelete(path: string, params: Record<string, string | number> = {}) {
  const signed = sign({ ...params, timestamp: Date.now() });
  const res = await fetch(`${BASE_URL}${path}?${signed}`, {
    method: "DELETE",
    headers: { "X-MBX-APIKEY": API_KEY },
  });
  if (!res.ok) throw new Error(`Dzengi ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
```

---

## WebSocket Streams

Connect to: `wss://api.dzengi.com/v1/api/stream/<streamName>`

**Stream names:**
| Stream | Format |
|--------|--------|
| Trade stream | `<symbol>@trade` |
| Kline | `<symbol>@kline_<interval>` |
| Mini ticker | `<symbol>@miniTicker` |
| Full ticker | `<symbol>@ticker` |
| Book ticker | `<symbol>@bookTicker` |
| Depth (partial) | `<symbol>@depth<levels>` (5, 10, 20) |
| Depth (diff) | `<symbol>@depth` |

All symbols are **lowercase** in stream names (e.g. `btcusdc@trade`).

**Combined streams:** `wss://api.dzengi.com/v1/api/stream?streams=btcusdc@trade/btcusdc@kline_1m`

**User data stream (private):**
1. POST `/api/v1/userDataStream` → `{ listenKey: "..." }` (signed)
2. Connect to `wss://api.dzengi.com/v1/api/stream/<listenKey>`
3. Keep-alive: PUT `/api/v1/userDataStream?listenKey=...` every 30 min
4. Close: DELETE `/api/v1/userDataStream?listenKey=...`

---

## Environment Variables

```
DZENGI_API_KEY         # API key from dzengi.com account
DZENGI_SECRET_KEY      # Secret key
DZENGI_DEMO            # "true" to use demo-api.dzengi.com
```

---

## Common Symbols

| Pair | Symbol param |
|------|-------------|
| BTC/USDT | `BTCUSDT` |
| ETH/USDT | `ETHUSDT` |
| BTC/USD  | `BTCUSD` |

> Note: verify exact symbol names via `GET /api/v1/exchangeInfo`

---

## Error Response Format

```json
{
  "code": -1121,
  "msg": "Invalid symbol."
}
```

Common error codes:
- `-1100` — Illegal characters in parameter
- `-1121` — Invalid symbol
- `-2010` — New order rejected (e.g. insufficient balance)
- `-2011` — Cancel rejected (order not found)
- `-1022` — Invalid signature
- `-1021` — Timestamp outside recvWindow


:wq
