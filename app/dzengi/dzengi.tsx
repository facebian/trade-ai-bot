"use client";

import { Button } from "@/components/ui/button";
import { useDzengiPing } from "@/hooks/useDzengiPing";
import { useDzengiCurrencies } from "@/hooks/useDzengiCurrencies";
import { cn } from "@/lib/utils";
import type { DzengiAccountData } from "@/lib/dzengi";
import {
  IconRefresh,
  IconWifi,
  IconWifiOff,
  IconWallet,
  IconCheck,
  IconX,
  IconCurrencyDollar,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const DzengiPage = ({ account }: { account: DzengiAccountData }) => {
  const { ping, pingLoading, refreshPing } = useDzengiPing();
  const { currencies, currenciesLoading, refreshCurrencies } = useDzengiCurrencies();
  const isOnline = ping?.status === "ok";
  const accountOk = account.status === "ok";

  return (
    <>
      {/* API Status Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            API Status
          </p>
          <Button
            onClick={() => refreshPing()}
            disabled={pingLoading}
            variant="outline"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <IconRefresh size={14} className={cn(pingLoading && "animate-spin")} />
          </Button>
        </div>

        {pingLoading && !ping ? (
          <p className="text-sm text-muted-foreground font-mono animate-pulse">Checking...</p>
        ) : ping ? (
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isOnline
                    ? "bg-buy shadow-[0_0_6px_#00ff88]"
                    : "bg-sell shadow-[0_0_6px_#ff4466]",
                )}
              />
              {isOnline ? (
                <IconWifi size={16} className="text-buy" />
              ) : (
                <IconWifiOff size={16} className="text-sell" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-semibold", isOnline ? "text-buy" : "text-sell")}>
                {isOnline ? "Online" : "Unreachable"}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {isOnline && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Latency: {ping.latencyMs} ms
                  </p>
                )}
                {ping.endpoint && (
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {ping.endpoint}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground font-mono">
                  Checked: {formatTime(ping.checkedAt)}
                </p>
                {ping.serverTime && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Server time: {formatTime(ping.serverTime)}
                  </p>
                )}
              </div>
              {!isOnline && ping.error && (
                <p className="mt-1 text-xs text-sell font-mono">{ping.error}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Account Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconWallet size={14} className="text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Account
          </p>
        </div>

        {!accountOk && account?.error ? (
          <p className="text-sm text-sell font-mono">{account.error}</p>
        ) : accountOk && account ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {(
                [
                  { label: "Trade", value: account.canTrade },
                  { label: "Withdraw", value: account.canWithdraw },
                  { label: "Deposit", value: account.canDeposit },
                ] as { label: string; value: boolean | undefined }[]
              ).map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {value ? (
                    <IconCheck size={13} className="text-buy" />
                  ) : (
                    <IconX size={13} className="text-sell" />
                  )}
                  <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {account.balances && account.balances.length > 0 ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Balances
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {account.balances.map((b) => {
                    const free = parseFloat(b.free);
                    const locked = parseFloat(b.locked);
                    return (
                      <div
                        key={b.asset}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border"
                      >
                        <span className="text-sm font-mono font-semibold">{b.asset}</span>
                        <div className="text-right">
                          <p className="text-sm font-mono">
                            {free.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                          </p>
                          {locked > 0 && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              locked: {locked.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">No balances found</p>
            )}

            <p className="text-[10px] text-muted-foreground font-mono">
              Updated: {formatTime(account.fetchedAt)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Currencies Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconCurrencyDollar size={14} className="text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Markets
            </p>
            {currencies?.fetchedAt && (
              <span className="text-[10px] text-muted-foreground font-mono">
                · {formatTime(currencies.fetchedAt)}
              </span>
            )}
          </div>
          <Button
            onClick={() => refreshCurrencies()}
            disabled={currenciesLoading}
            variant="outline"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <IconRefresh size={14} className={cn(currenciesLoading && "animate-spin")} />
          </Button>
        </div>

        {currenciesLoading && !currencies ? (
          <p className="text-sm text-muted-foreground font-mono animate-pulse">Loading...</p>
        ) : currencies?.status === "error" ? (
          <p className="text-sm text-sell font-mono">{currencies.error}</p>
        ) : currencies?.tickers && currencies.tickers.length > 0 ? (
          <div className="divide-y divide-border">
            {currencies.tickers.map((t) => {
              const change = parseFloat(t.priceChangePercent);
              const isPositive = change >= 0;
              const price = parseFloat(t.lastPrice);
              return (
                <div
                  key={t.symbol}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-mono font-semibold">{t.symbol}</span>
                  <div className="flex items-center gap-4 shrink-0">
                    <p className="text-sm font-mono">
                      {price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: price < 1 ? 6 : 2,
                      })}
                    </p>
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-[11px] font-mono w-16 justify-end",
                        isPositive ? "text-buy" : "text-sell",
                      )}
                    >
                      {isPositive ? (
                        <IconArrowUpRight size={12} />
                      ) : (
                        <IconArrowDownRight size={12} />
                      )}
                      {isPositive ? "+" : ""}
                      {change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-mono">No data</p>
        )}
      </div>
    </>
  );
};

export default DzengiPage;
