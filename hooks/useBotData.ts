"use client";

import { useState, useEffect, useCallback } from "react";
import type { BotState } from "@/lib/types";

export function useBotData() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/status");
      if (res.ok) setBotState(await res.json());
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
    await fetch("/api/bot/start", { method: "POST" });
    await fetchStatus();
    setActionPending(false);
  };

  const stopBot = async () => {
    setActionPending(true);
    await fetch("/api/bot/stop", { method: "POST" });
    await fetchStatus();
    setActionPending(false);
  };

  return { botState, loading, actionPending, startBot, stopBot };
}
