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
npx shadcn@latest add <component-name>
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui

**Key dependencies:** `@anthropic-ai/sdk`, `ccxt` (Bybit exchange), `recharts` (charts), `uuid`, `@tabler/icons-react`

**Key conventions:**

- `app/` — Next.js App Router pages and layouts; uses React Server Components by default
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge) for conditional class merging; use this everywhere for className composition
- `@/*` path alias maps to the project root

**UI system:** shadcn/ui with `radix-nova` style preset, Tabler icons (`@tabler/icons-react`), and OKLCH-based CSS variables for theming (defined in `app/globals.css`). Dark mode is CSS-variable-driven.

**Tailwind v4** — uses `@tailwindcss/postcss` plugin (not the classic `tailwind.config.js` approach). Theme extensions go in `globals.css` via `@theme`.

## Bot Architecture

This is an AI-powered crypto trading bot. Core modules in `lib/`:

| File | Responsibility |
|------|---------------|
| `lib/types.ts` | All shared TypeScript types (`BotState`, `Trade`, `Position`, `ClaudeAnalysis`, `Indicators`, etc.) |
| `lib/bot.ts` | Bot lifecycle (`startBot`, `stopBot`, `getBotState`); runs analysis cycle every 30s via `setInterval`; bot state is in-memory (replace with Redis/PostgreSQL for production) |
| `lib/exchange.ts` | Bybit integration via `ccxt`; fetches market data, OHLCV candles, account balance; executes market buy/sell orders; calculates all technical indicators (RSI, EMA, MACD, Bollinger Bands, ATR, Stochastic) |
| `lib/claude.ts` | Sends market data + indicators + sentiment + news to Claude (`claude-sonnet-4-20250514`); parses JSON trading decision (`BUY`/`SELL`/`HOLD`) |
| `lib/news.ts` | Fetches crypto news from CryptoCompare API; performs keyword-based sentiment detection |

**Analysis cycle flow:** `getMarketData` + `getOHLCV` + `getSentimentData` + `getCryptoNews` → `calculateIndicators` → `analyzeMarket` (Claude) → `executeDecision` (buy/sell on Bybit) → `updateStats`

**Trading pairs:** `BTC/USDT`, `ETH/USDT`, `SOL/USDT` — configured via `TRADING_PAIR` env var (default: `BTC/USDT`)

## Environment Variables

```
ANTHROPIC_API_KEY       # Required — Claude API key
BYBIT_API_KEY           # Required — Bybit API key
BYBIT_SECRET_KEY        # Required — Bybit secret key
USE_TESTNET=true        # Use Bybit testnet (sandbox mode)
TRADING_PAIR=BTC/USDT   # Trading pair (default: BTC/USDT)
POSITION_SIZE=100       # Position size in USDT (default: 100)
CRYPTOCOMPARE_API_KEY   # Optional — up to 100k req/month free
```

## Known TODOs

- `lib/exchange.ts`: `btcDominance`, `marketCapChange24h`, `fundingRate`, `longShortRatio` in `getSentimentData()` return hardcoded values — need CoinGecko and Bybit Funding Rate APIs
- Bot state is in-memory — loses data on server restart; production should use Redis or PostgreSQL
