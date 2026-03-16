"use client";

import { IconBuildingBank, IconRefresh, IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useDzengiPing } from "@/hooks/useDzengiPing";
import { cn } from "@/lib/utils";

function formatCheckedAt(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DzengiPage() {
  const { ping, pingLoading, refreshPing } = useDzengiPing();

  const isOk = ping?.status === "ok";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <IconBuildingBank size={18} className="text-trade" />
          <span className="text-base font-bold tracking-tight">Dzengi</span>
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">
            dzengi.com
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* API Status Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              API Status
            </p>
            <button
              onClick={() => refreshPing()}
              disabled={pingLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <IconRefresh size={14} className={cn(pingLoading && "animate-spin")} />
            </button>
          </div>

          {pingLoading && !ping ? (
            <p className="text-sm text-muted-foreground font-mono animate-pulse">
              Checking...
            </p>
          ) : ping ? (
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isOk
                      ? "bg-buy shadow-[0_0_6px_#00ff88]"
                      : "bg-sell shadow-[0_0_6px_#ff4466]",
                  )}
                />
                {isOk ? (
                  <IconWifi size={16} className="text-buy" />
                ) : (
                  <IconWifiOff size={16} className="text-sell" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-base font-semibold", isOk ? "text-buy" : "text-sell")}>
                  {isOk ? "Online" : "Unreachable"}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  {isOk && (
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
                    Checked: {formatCheckedAt(ping.checkedAt)}
                  </p>
                  {ping.serverTime && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Server time: {formatCheckedAt(ping.serverTime)}
                    </p>
                  )}
                </div>
                {!isOk && ping.error && (
                  <p className="mt-1 text-xs text-sell font-mono">{ping.error}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Placeholder */}
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-center">
          <IconBuildingBank size={36} className="text-muted-foreground" />
          <p className="text-base font-semibold">Dzengi Exchange</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Custom integration for dzengi.com — coming soon.
            <br />
            dzengi.com is not available in ccxt, so this page will use a manual
            API implementation.
          </p>
        </div>
      </main>
    </div>
  );
}
