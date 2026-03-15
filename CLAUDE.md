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
