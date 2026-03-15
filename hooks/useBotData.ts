"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { HttpMethods, type BotState, type Trade } from "@/lib/types";

export function useBotData() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  // Track known trade IDs so we can detect new ones
  const knownTradeIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/status");
      if (!res.ok) return;

      const next: BotState = await res.json();

      console.log('next : >>>', next);
      

      if (!initialized.current) {
        // First load — seed known IDs, no toasts
        next.trades.forEach((t: Trade) => knownTradeIds.current.add(t.id));
        initialized.current = true;
      } else {
        // Subsequent polls — show toast for each new trade
        const newTrades = next.trades.filter(
          (t: Trade) => !knownTradeIds.current.has(t.id),
        );
        newTrades.forEach((t: Trade) => {
          knownTradeIds.current.add(t.id);
          const isBuy = t.type === "BUY";
          const pnlStr =
            t.pnl != null
              ? ` · P&L: ${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`
              : "";
          const fn = isBuy ? toast.success : t.pnl != null && t.pnl < 0 ? toast.error : toast.success;
          fn(`${t.type} ${t.pair} @ $${t.price.toLocaleString()}${pnlStr}`, {
            description: t.reasoning,
            duration: 8000,
          });
        });
      }

      setBotState(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const startBot = async () => {
    setActionPending(true);
    await fetch("/api/bot/start", { method: HttpMethods.POST });
    await fetchStatus();
    setActionPending(false);
  };

  const stopBot = async () => {
    setActionPending(true);
    await fetch("/api/bot/stop", { method: HttpMethods.POST });
    await fetchStatus();
    setActionPending(false);
  };

  const closePosition = async () => {
    setActionPending(true);
    await fetch("/api/bot/close", { method: HttpMethods.POST });
    await fetchStatus();
    setActionPending(false);
  };

  return { botState, loading, actionPending, startBot, stopBot, closePosition };
}
