"use client";

import { useState, useEffect } from "react";

export interface CurrencyRates {
  EUR: number; // 1 USD → EUR
  PLN: number; // 1 USD → PLN
  USD: number; // 1 USD → USDC (примерно 1, может быть чуть меньше из-за комиссий)
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
        console.log('data : >>>', data);
        
        const r: CurrencyRates = {
          EUR: data.rates?.EUR ?? 0.92,
          PLN: data.rates?.PLN ?? 4.0,
          USD: 1.0, // USDC обычно почти 1 к 1 с USD, но может быть чуть меньше из-за комиссий
        };
        cachedRates = r;
        cachedAt = Date.now();
        setRates(r);
      } catch {
        // Fallback to approximate rates if API is unavailable
        setRates({ EUR: 0.92, PLN: 4.0, USD: 1.0 });
      }
    };
    load();
  }, []);

  return rates;
}
