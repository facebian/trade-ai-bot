"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, CandlestickSeriesOptions } from "lightweight-charts";
import type { MarketData, PricePoint } from "@/lib/types";

interface PriceChartProps {
  marketData: MarketData | null;
  candles: PricePoint[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toChartData(candles: PricePoint[]): any[] {
  return candles.map((c) => ({
    time: Math.floor(c.time / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function PriceChart({ marketData, candles }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | any>(null);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    import("lightweight-charts").then((lc) => {
      if (!isMounted || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        autoSize: true,
        height: 260,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#888888",
          fontFamily: "monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "#e8e8e8" },
          horzLines: { color: "#e8e8e8" },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const seriesOptions: Partial<CandlestickSeriesOptions> = {
        upColor: "#00ff88",
        downColor: "#ff4466",
        borderUpColor: "#00ff88",
        borderDownColor: "#ff4466",
        wickUpColor: "#00ff88",
        wickDownColor: "#ff4466",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = (chart as any).addSeries(lc.CandlestickSeries, seriesOptions);

      if (candlesRef.current && candlesRef.current.length > 0) {
        series.setData(toChartData(candlesRef.current));
        chart.timeScale().fitContent();
      }

      chartRef.current = chart;
      seriesRef.current = series;
    });

    return () => {
      isMounted = false;
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0) return;
    seriesRef.current.setData(toChartData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const change = marketData?.priceChange24h ?? 0;
  const changeColor = change >= 0 ? "#00ff88" : "#ff4466";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            SOL / USDC · 5m · Last 100 candles
          </p>
          <p className="text-2xl font-mono font-bold mt-1">
            {marketData
              ? `$${marketData.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold" style={{ color: changeColor }}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">24h change</p>
          {marketData && (
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              H {marketData.high24h.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·{" "}
              L {marketData.low24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>
      <div ref={containerRef} style={{ height: 260 }} />
    </div>
  );
}
