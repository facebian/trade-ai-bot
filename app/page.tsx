"use client";

import { useBotData } from "@/hooks/useBotData";
import { usePriceData } from "@/hooks/usePriceData";
import { StatsRow } from "@/components/StatsRow";
import { PriceChart } from "@/components/PriceChart";
import { AIPanel } from "@/components/AIPanel";
import { TradeHistory } from "@/components/TradeHistory";
import { NetworkBadge } from "@/components/NetworkBadge";
import { IconActivity } from "@tabler/icons-react";
import { TradingPair } from "@/lib/types";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";

export default function Home() {
  const { botState, loading, actionPending, startBot, stopBot, setNetwork } =
    useBotData();
  const priceData = usePriceData();
  const rates = useCurrencyRates();

  console.log('botState : >>', botState);
  

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

  const lastUpdated = new Date(botState.lastUpdated).toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
  );

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
            <NetworkBadge
              network={botState.network}
              onSwitch={setNetwork}
              disabled={actionPending}
            />
            <p className='text-[11px] text-muted-foreground font-mono hidden sm:block'>
              Updated {lastUpdated}
            </p>
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
            actionPending={actionPending}
          />
          <TradeHistory trades={botState.trades} />
        </div>
      </main>
    </div>
  );
}
