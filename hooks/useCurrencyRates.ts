"use client";

import { useState, useEffect } from "react";

export interface CurrencyRates {
  EUR: number; // 1 USD → EUR
  PLN: number; // 1 USD → PLN
}

// Открытый API без ключа, обновляется раз в сутки
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

let cachedRates: CurrencyRates | null = null;
let cachedAt = 0;

export function useCurrencyRates(): CurrencyRates | null {
  const [rates, setRates] = useState<CurrencyRates | null>(cachedRates);

  useEffect(() => {
    const load = async () => {
      if (cachedRates && Date.now() - cachedAt < CACHE_TTL_MS) {
        setRates(cachedRates);
        return;
      }
      try {
        const res = await fetch(RATES_URL);
        const data = await res.json();
        const r: CurrencyRates = {
          EUR: data.rates?.EUR ?? 0.92,
          PLN: data.rates?.PLN ?? 4.0,
        };
        cachedRates = r;
        cachedAt = Date.now();
        setRates(r);
      } catch {
        // Fallback to approximate rates if API is unavailable
        setRates({ EUR: 0.92, PLN: 4.0 });
      }
    };
    load();
  }, []);

  return rates;
}
