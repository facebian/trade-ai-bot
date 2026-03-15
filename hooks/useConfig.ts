"use client";

import useSWR from "swr";
import type { BotConfig } from "@/app/actions/config";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useConfig() {
  const { data, error, isLoading, mutate } = useSWR<BotConfig>(
    "/api/config",
    fetcher,
    {
      refreshInterval: 120_000,     // фоновое обновление каждую минуту
      revalidateOnFocus: true,      // обновить при возврате на вкладку
      revalidateOnReconnect: true,  // обновить при восстановлении сети
    },
  );

  return {
    config: data ?? null,
    configLoading: isLoading,
    configError: error ?? null,
    mutateConfig: mutate,
  };
}
