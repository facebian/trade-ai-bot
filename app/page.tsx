"use client";

import { useBotData } from "@/hooks/useBotData";
import { usePriceData } from "@/hooks/usePriceData";
import { useConfig } from "@/hooks/useConfig";
import { StatsRow } from "@/components/StatsRow";
import { PriceChart } from "@/components/PriceChart";
import { AIPanel } from "@/components/AIPanel";
import { TradeHistory } from "@/components/TradeHistory";
import { IconActivity, IconSettings } from "@tabler/icons-react";
import { TradingPair } from "@/lib/types";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";

function formatMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${s}s`;
}

export default function Home() {
  const { botState, loading, actionPending, startBot, stopBot, closePosition } =
    useBotData();
  const priceData = usePriceData();
  const rates = useCurrencyRates();
  const { config } = useConfig();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-muted-foreground text-sm font-mono animate-pulse'>
          Connecting...
        </p>
      </div>
    );
  }

  if (!botState) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-sell text-sm font-mono'>Failed to connect to bot</p>
      </div>
    );
  }

  const intervalMs = (config?.analysis_interval_min ?? 5) * 60_000;
  const elapsed = now - botState.lastUpdated;
  const remaining = intervalMs - elapsed;
  const timerLabel =
    botState.status === "running"
      ? remaining > 0
        ? `Next in ${formatMs(remaining)}`
        : "Analyzing..."
      : `${formatMs(elapsed)} ago`;

  return (
    <div className='min-h-screen bg-zinc-50'>
      {/* Header */}
      <header className='sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <IconActivity size={18} className='text-trade' />
            <span className='text-base font-bold tracking-tight'>TradeAI</span>
            <span className='text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full'>
              {process.env.NEXT_PUBLIC_TRADING_PAIR ?? TradingPair.BTC_USDT}
            </span>
          </div>
          <div className='flex items-center gap-3'>
            <div
              title={botState.lastError ?? `Status: ${botState.status}`}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                botState.lastError
                  ? "bg-sell shadow-[0_0_6px_#ff4466]"
                  : botState.status === "running"
                    ? "bg-buy shadow-[0_0_6px_#00ff88] animate-pulse"
                    : "bg-zinc-400",
              )}
            />
            <p className='text-[11px] text-muted-foreground font-mono hidden sm:block'>
              {timerLabel}
            </p>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <IconSettings size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className='max-w-7xl mx-auto p-4 md:p-6 space-y-4'>
        <StatsRow
          botState={botState}
          marketData={priceData?.marketData ?? null}
          rates={rates}
        />

        <PriceChart
          marketData={priceData?.marketData ?? null}
          candles={priceData?.candles ?? null}
        />

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <AIPanel
            botState={botState}
            onStart={startBot}
            onStop={stopBot}
            onClosePosition={closePosition}
            actionPending={actionPending}
          />
          <TradeHistory trades={botState.trades} />
        </div>
      </main>
    </div>
  );
}
