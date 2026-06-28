"use client";

import type { CurrencyRates } from "@/hooks/useCurrencyRates";
import { IconCurrencyDollar } from "@tabler/icons-react";

interface CurrencyTableProps {
  rates: CurrencyRates | null;
}

const CURRENCIES = [
  { code: "USD", name: "US Dollar",          flag: "🇺🇸" },
  { code: "EUR", name: "Euro",               flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",      flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen",       flag: "🇯🇵" },
  { code: "CHF", name: "Swiss Franc",        flag: "🇨🇭" },
  { code: "CAD", name: "Canadian Dollar",    flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar",  flag: "🇦🇺" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "CNY", name: "Chinese Yuan",       flag: "🇨🇳" },
  { code: "HKD", name: "Hong Kong Dollar",   flag: "🇭🇰" },
  { code: "SGD", name: "Singapore Dollar",   flag: "🇸🇬" },
  { code: "NOK", name: "Norwegian Krone",    flag: "🇳🇴" },
  { code: "SEK", name: "Swedish Krona",      flag: "🇸🇪" },
  { code: "DKK", name: "Danish Krone",       flag: "🇩🇰" },
  { code: "PLN", name: "Polish Złoty",       flag: "🇵🇱" },
  { code: "CZK", name: "Czech Koruna",       flag: "🇨🇿" },
  { code: "HUF", name: "Hungarian Forint",   flag: "🇭🇺" },
  { code: "TRY", name: "Turkish Lira",       flag: "🇹🇷" },
  { code: "BRL", name: "Brazilian Real",     flag: "🇧🇷" },
  { code: "INR", name: "Indian Rupee",       flag: "🇮🇳" },
];

function fmtRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 10)  return rate.toFixed(3);
  return rate.toFixed(4);
}

export function CurrencyTable({ rates }: CurrencyTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
          <IconCurrencyDollar size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Currency Rates</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">1 USD = ...</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1">
        {CURRENCIES.map(({ code, name, flag }) => {
          const rate = rates?.[code];
          return (
            <div
              key={code}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-base leading-none select-none">{flag}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-mono font-bold text-foreground">{code}</p>
                <p className="text-[10px] text-muted-foreground truncate">{name}</p>
              </div>
              <p className="ml-auto text-[11px] font-mono text-foreground shrink-0">
                {rate != null ? fmtRate(rate) : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
