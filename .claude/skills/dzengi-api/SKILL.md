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
