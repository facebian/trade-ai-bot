import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

interface TradeHistoryProps {
  trades: Trade[];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Trade History</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {trades.length} total
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No trades yet
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2.5 font-medium uppercase tracking-wider text-[11px]">
                  Type
                </th>
                <th className="text-right pb-2.5 font-medium uppercase tracking-wider text-[11px]">
                  Price
                </th>
                <th className="text-right pb-2.5 font-medium uppercase tracking-wider text-[11px]">
                  Total
                </th>
                <th className="text-right pb-2.5 font-medium uppercase tracking-wider text-[11px]">
                  P&L
                </th>
                <th className="text-right pb-2.5 font-medium uppercase tracking-wider text-[11px] hidden sm:table-cell">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.slice(0, 20).map((trade) => {
                const isBuy = trade.type === "BUY";
                const hasPnl = trade.pnl !== null;
                const pnlPositive = (trade.pnl ?? 0) >= 0;

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono",
                          isBuy
                            ? "bg-[#00ff88]/15 text-[#009955]"
                            : "bg-[#ff4466]/15 text-[#cc2244]",
                        )}
                      >
                        {isBuy ? (
                          <IconArrowUpRight size={11} />
                        ) : (
                          <IconArrowDownRight size={11} />
                        )}
                        {trade.type}
                      </span>
                    </td>

                    <td className="py-2.5 text-right font-mono">
                      ${trade.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </td>

                    <td className="py-2.5 text-right font-mono">
                      ${trade.total.toFixed(2)}
                    </td>

                    <td
                      className={cn(
                        "py-2.5 text-right font-mono font-semibold",
                        !hasPnl
                          ? "text-muted-foreground"
                          : pnlPositive
                            ? "text-[#00ff88]"
                            : "text-[#ff4466]",
                      )}
                    >
                      {hasPnl
                        ? `${pnlPositive ? "+" : ""}$${trade.pnl!.toFixed(2)}`
                        : "open"}
                    </td>

                    <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                      {formatTime(trade.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
