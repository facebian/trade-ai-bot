"use client";

import { useState, useEffect } from "react";
import type { MarketData, PricePoint } from "@/lib/types";

export interface PriceData {
  marketData: MarketData;
  candles: PricePoint[];
}

export function usePriceData() {
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/price");
        if (res.ok) setData(await res.json());
      } catch {}
    };
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, []);

  return data;
}
