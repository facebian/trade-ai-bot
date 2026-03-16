"use client";

import useSWR from "swr";

export interface DzengiPingResult {
  status: "ok" | "error";
  latencyMs: number;
  serverTime?: number;
  checkedAt: number;
  endpoint?: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDzengiPing() {
  const { data, isLoading, mutate } = useSWR<DzengiPingResult>(
    "/api/dzengi/ping",
    fetcher,
    {
      refreshInterval: 5 * 60_000, // every 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  console.log('data : >>>', data);
  

  return {
    ping: data ?? null,
    pingLoading: isLoading,
    refreshPing: mutate,
  };
}
