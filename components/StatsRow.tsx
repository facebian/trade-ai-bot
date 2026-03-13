import type { BotState, MarketData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  IconWallet,
  IconCurrencyBitcoin,
  IconChartBar,
  IconTrendingUp,
} from "@tabler/icons-react";

interface StatsRowProps {
  botState: BotState;
  marketData: MarketData | null;
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex gap-3 items-start">
      <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p
          className={cn(
            "text-xl font-mono font-bold mt-0.5 truncate",
            valueColor,
          )}
        >
          {value}
        </p>
        {subValue && (
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

export function StatsRow({ botState, marketData }: StatsRowProps) {
  const pnlPositive = botState.totalPnl >= 0;
  const pnlSign = pnlPositive ? "+" : "";
  const priceChange = marketData?.priceChange24h ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<IconWallet size={18} />}
        label="Balance"
        value={`$${botState.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subValue={`Start $${botState.startBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <StatCard
        icon={<IconCurrencyBitcoin size={18} />}
        label="BTC / USDT"
        value={
          marketData
            ? `$${marketData.price.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
            : "—"
        }
        subValue={
          marketData
            ? `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}% 24h`
            : "Loading..."
        }
        valueColor={
          marketData
            ? priceChange >= 0
              ? "text-[#00ff88]"
              : "text-[#ff4466]"
            : undefined
        }
      />
      <StatCard
        icon={<IconChartBar size={18} />}
        label="Trades"
        value={String(botState.trades.length)}
        subValue={`Win rate ${botState.winRate.toFixed(0)}%`}
      />
      <StatCard
        icon={<IconTrendingUp size={18} />}
        label="Total P&L"
        value={`${pnlSign}$${botState.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subValue={`${pnlSign}${botState.totalPnlPercent.toFixed(2)}%`}
        valueColor={pnlPositive ? "text-[#00ff88]" : "text-[#ff4466]"}
      />
    </div>
  );
}
