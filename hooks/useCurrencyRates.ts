"use client";

import { useState, useEffect } from "react";

export type CurrencyRates = Record<string, number>;

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
  "CNY", "HKD", "SGD", "NOK", "SEK", "DKK", "PLN", "CZK",
  "HUF", "TRY", "BRL", "INR",
];

const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000;

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

        const r: CurrencyRates = { USD: 1.0 };
        for (const code of CURRENCIES) {
          if (data.rates?.[code] != null) r[code] = data.rates[code];
        }

        cachedRates = r;
        cachedAt = Date.now();
        setRates(r);
      } catch {
        setRates({ USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.5, CHF: 0.9, CAD: 1.36,
          AUD: 1.54, NZD: 1.67, CNY: 7.24, HKD: 7.82, SGD: 1.35, NOK: 10.6,
          SEK: 10.4, DKK: 6.9, PLN: 4.0, CZK: 23.1, HUF: 363, TRY: 32.4,
          BRL: 5.0, INR: 83.5 });
      }
    };
    load();
  }, []);

  return rates;
}
