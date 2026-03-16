"use client";

import useSWR from "swr";
import type { DzengiTicker } from "@/app/api/dzengi/currencies/route";

export interface DzengiCurrenciesResult {
  status: "ok" | "error";
  tickers?: DzengiTicker[];
  fetchedAt: number;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDzengiCurrencies() {
  const { data, isLoading, mutate } = useSWR<DzengiCurrenciesResult>(
    "/api/dzengi/currencies",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    },
  );

  console.log("data : >>>", data);

  return {
    currencies: data ?? null,
    currenciesLoading: isLoading,
    refreshCurrencies: mutate,
  };
}
