"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MarketData, PricePoint } from "@/lib/types";

interface PriceChartProps {
  marketData: MarketData | null;
  candles: PricePoint[] | null;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function PriceChart({ marketData, candles }: PriceChartProps) {
  if (!marketData || !candles) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 h-[300px] flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading chart...
      </div>
    );
  }

  const chartData = candles.map((c) => ({
    time: formatTime(c.time),
    price: c.price,
  }));

  const prices = candles.map((c) => c.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.08;

  const change = marketData.priceChange24h;
  const changeColor = change >= 0 ? "#00ff88" : "#ff4466";
  const lineColor = change >= 0 ? "#00ff88" : "#ff4466";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            SOL / USDC · 15m · Last 100 candles
          </p>
          <p className="text-2xl font-mono font-bold mt-1">
            $
            {marketData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-lg font-mono font-bold"
            style={{ color: changeColor }}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">24h change</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            H {marketData.high24h.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·{" "}
            L {marketData.low24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.922 0 0)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "oklch(0.556 0 0)",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "oklch(0.556 0 0)",
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              `$${(v / 1000).toFixed(1)}k`
            }
            width={52}
          />
          <ReferenceLine
            y={marketData.price}
            stroke={lineColor}
            strokeDasharray="4 4"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const price = payload[0].value as number;
              return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                  <p className="text-[11px] text-muted-foreground">
                    {payload[0].payload.time}
                  </p>
                  <p className="text-sm font-mono font-bold">
                    $
                    {price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
