"use client";

import { Fragment, useState } from "react";
import {
  IconBrain,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { CurrencyAnalysisResult } from "@/app/api/currency-analysis/route";
import type { ForexIndicators } from "@/lib/forex-indicators";

// ─── Static meta ────────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { name: string; flag: string }> = {
  EUR: { name: "Euro",               flag: "🇪🇺" },
  GBP: { name: "British Pound",      flag: "🇬🇧" },
  JPY: { name: "Japanese Yen",       flag: "🇯🇵" },
  CHF: { name: "Swiss Franc",        flag: "🇨🇭" },
  CAD: { name: "Canadian Dollar",    flag: "🇨🇦" },
  AUD: { name: "Australian Dollar",  flag: "🇦🇺" },
  NZD: { name: "New Zealand Dollar", flag: "🇳🇿" },
  CNY: { name: "Chinese Yuan",       flag: "🇨🇳" },
  HKD: { name: "Hong Kong Dollar",   flag: "🇭🇰" },
  SGD: { name: "Singapore Dollar",   flag: "🇸🇬" },
  NOK: { name: "Norwegian Krone",    flag: "🇳🇴" },
  SEK: { name: "Swedish Krona",      flag: "🇸🇪" },
  DKK: { name: "Danish Krone",       flag: "🇩🇰" },
  PLN: { name: "Polish Złoty",       flag: "🇵🇱" },
  CZK: { name: "Czech Koruna",       flag: "🇨🇿" },
  HUF: { name: "Hungarian Forint",   flag: "🇭🇺" },
  TRY: { name: "Turkish Lira",       flag: "🇹🇷" },
  BRL: { name: "Brazilian Real",     flag: "🇧🇷" },
  INR: { name: "Indian Rupee",       flag: "🇮🇳" },
};

const INDICATOR_GUIDE = [
  {
    name: "RSI (14)",
    short: "Relative Strength Index",
    buy: "> 70 — rate overbought, reversal down → foreign strengthens",
    sell: "< 30 — rate oversold, reversal up → foreign weakens",
    neutral: "30–70 — no extremes",
  },
  {
    name: "EMA 9 / 21",
    short: "Exponential Moving Average cross",
    buy: "EMA9 < EMA21 — short-term rate below medium-term → downtrend",
    sell: "EMA9 > EMA21 — short-term rate above medium-term → uptrend",
    neutral: "Lines very close — no clear trend",
  },
  {
    name: "MACD (12, 26, 9)",
    short: "Moving Avg Convergence Divergence",
    buy: "Histogram < 0 — bearish rate momentum",
    sell: "Histogram > 0 — bullish rate momentum",
    neutral: "Histogram ≈ 0",
  },
  {
    name: "BB% (20, 2σ)",
    short: "Bollinger Band position",
    buy: "> 80% — rate near upper band, overbought",
    sell: "< 20% — rate near lower band, oversold",
    neutral: "20–80% — within normal range",
  },
  {
    name: "Stochastic K (14, 3)",
    short: "%K momentum oscillator",
    buy: "> 80 — rate overbought, reversal likely",
    sell: "< 20 — rate oversold, reversal likely",
    neutral: "20–80 — neutral zone",
  },
  {
    name: "ROC (10d)",
    short: "Rate of Change over 10 days",
    buy: "< −0.1% — rate losing momentum, falling",
    sell: "> +0.1% — rate gaining momentum, rising",
    neutral: "±0.1% — minimal momentum",
  },
  {
    name: "vs SMA 50",
    short: "Price vs 50-day Simple Moving Average",
    buy: "Rate < SMA50 — below long-term average, downtrend",
    sell: "Rate > SMA50 — above long-term average, uptrend",
    neutral: "N/A — always BUY or SELL",
  },
];

// ─── Signal logic ────────────────────────────────────────────────────────────

// All signals are expressed from the foreign-currency perspective:
// BUY = foreign currency expected to STRENGTHEN vs USD (USD/XXX rate falls)
// SELL = foreign currency expected to WEAKEN vs USD (USD/XXX rate rises)

type IndSignal = "BUY" | "SELL" | "NEUTRAL";

interface IndicatorDetail {
  label: string;
  signal: IndSignal;
  value: string;
  reason: string;
}

function fmtRate(v: number) {
  if (v >= 100) return v.toFixed(2);
  if (v >= 10)  return v.toFixed(3);
  return v.toFixed(4);
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function getIndicatorDetails(ind: ForexIndicators): IndicatorDetail[] {
  return [
    {
      label: "RSI (14)",
      signal: ind.rsi14 > 70 ? "BUY" : ind.rsi14 < 30 ? "SELL" : "NEUTRAL",
      value: ind.rsi14.toFixed(1),
      reason:
        ind.rsi14 > 70
          ? `${ind.rsi14.toFixed(1)} — rate overbought, reversal down expected`
          : ind.rsi14 < 30
          ? `${ind.rsi14.toFixed(1)} — rate oversold, reversal up expected`
          : `${ind.rsi14.toFixed(1)} — neutral zone (30–70)`,
    },
    {
      label: "EMA 9 / 21",
      signal: ind.ema9 < ind.ema21 ? "BUY" : ind.ema9 > ind.ema21 ? "SELL" : "NEUTRAL",
      value: ind.ema9 < ind.ema21
        ? `${fmtRate(ind.ema9)} < ${fmtRate(ind.ema21)}`
        : `${fmtRate(ind.ema9)} > ${fmtRate(ind.ema21)}`,
      reason: ind.ema9 < ind.ema21
        ? "EMA9 below EMA21 — rate in short-term downtrend, foreign strengthening"
        : "EMA9 above EMA21 — rate in short-term uptrend, foreign weakening",
    },
    {
      label: "MACD",
      signal: ind.macdHistogram < 0 ? "BUY" : ind.macdHistogram > 0 ? "SELL" : "NEUTRAL",
      value: `${ind.macdHistogram >= 0 ? "+" : ""}${ind.macdHistogram.toFixed(5)}`,
      reason: ind.macdHistogram < 0
        ? "Histogram negative — bearish rate momentum, foreign gaining"
        : "Histogram positive — bullish rate momentum, foreign losing",
    },
    {
      label: "BB% (20)",
      signal: ind.bbPercent > 80 ? "BUY" : ind.bbPercent < 20 ? "SELL" : "NEUTRAL",
      value: `${ind.bbPercent.toFixed(0)}%`,
      reason:
        ind.bbPercent > 80
          ? `${ind.bbPercent.toFixed(0)}% — rate near upper band, overbought, reversal down likely`
          : ind.bbPercent < 20
          ? `${ind.bbPercent.toFixed(0)}% — rate near lower band, oversold, reversal up likely`
          : `${ind.bbPercent.toFixed(0)}% — rate within normal Bollinger range`,
    },
    {
      label: "Stoch K (14)",
      signal: ind.stochK > 80 ? "BUY" : ind.stochK < 20 ? "SELL" : "NEUTRAL",
      value: `K ${ind.stochK.toFixed(1)} / D ${ind.stochD.toFixed(1)}`,
      reason:
        ind.stochK > 80
          ? `%K ${ind.stochK.toFixed(1)} — stochastic overbought, reversal down likely`
          : ind.stochK < 20
          ? `%K ${ind.stochK.toFixed(1)} — stochastic oversold, reversal up likely`
          : `%K ${ind.stochK.toFixed(1)} — neutral zone (20–80)`,
    },
    {
      label: "ROC (10d)",
      signal: ind.roc10 < -0.1 ? "BUY" : ind.roc10 > 0.1 ? "SELL" : "NEUTRAL",
      value: `${ind.roc10 >= 0 ? "+" : ""}${ind.roc10.toFixed(2)}%`,
      reason:
        ind.roc10 < -0.1
          ? `${ind.roc10.toFixed(2)}% — 10-day momentum negative, rate trending down`
          : ind.roc10 > 0.1
          ? `+${ind.roc10.toFixed(2)}% — 10-day momentum positive, rate trending up`
          : "Minimal 10-day momentum, no clear direction",
    },
    {
      label: "vs SMA 50",
      signal: ind.currentPrice < ind.sma50 ? "BUY" : "SELL",
      value: ind.currentPrice < ind.sma50
        ? `${fmtRate(ind.currentPrice)} < ${fmtRate(ind.sma50)}`
        : `${fmtRate(ind.currentPrice)} > ${fmtRate(ind.sma50)}`,
      reason: ind.currentPrice < ind.sma50
        ? `Rate below 50-day average (${fmtRate(ind.sma50)}) — long-term downtrend`
        : `Rate above 50-day average (${fmtRate(ind.sma50)}) — long-term uptrend`,
    },
  ];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SignalBadge({
  signal,
  size = "md",
}: {
  signal: "BUY" | "SELL" | "HOLD" | IndSignal;
  size?: "sm" | "md";
}) {
  const isBuy  = signal === "BUY";
  const isSell = signal === "SELL";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold font-mono",
        size === "sm" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
        isBuy  && "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30",
        isSell && "bg-[#ff4466]/10 text-[#ff4466] border border-[#ff4466]/30",
        !isBuy && !isSell && "bg-muted text-muted-foreground border border-border",
      )}
    >
      {isBuy  && <IconTrendingUp  size={size === "sm" ? 9 : 10} />}
      {isSell && <IconTrendingDown size={size === "sm" ? 9 : 10} />}
      {!isBuy && !isSell && <IconMinus size={size === "sm" ? 9 : 10} />}
      {signal}
    </span>
  );
}

function SignalDot({ signal, title }: { signal: IndSignal; title: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block w-2 h-2 rounded-full shrink-0",
        signal === "BUY"     && "bg-[#00ff88]",
        signal === "SELL"    && "bg-[#ff4466]",
        signal === "NEUTRAL" && "bg-zinc-500",
      )}
    />
  );
}

function Score({ details }: { details: IndicatorDetail[] }) {
  const buy  = details.filter((d) => d.signal === "BUY").length;
  const sell = details.filter((d) => d.signal === "SELL").length;
  const neu  = details.filter((d) => d.signal === "NEUTRAL").length;
  return (
    <div className="flex items-center gap-1 font-mono text-[10px] whitespace-nowrap">
      <span className="text-[#00ff88]">▲{buy}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="text-[#ff4466]">▼{sell}</span>
      {neu > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-zinc-500">─{neu}</span>
        </>
      )}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-[#00ff88]" : value >= 50 ? "bg-yellow-400" : "bg-zinc-500";
  return (
    <div className="flex items-center gap-1.5 min-w-[60px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{value}%</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CurrencyAnalysis() {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [results, setResults]     = useState<CurrencyAnalysisResult[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/currency-analysis", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResults(data.results);
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
            <IconBrain size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AI Forex Analysis</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {updatedAt
                ? `Updated ${new Date(updatedAt).toLocaleTimeString()}`
                : "19 currency pairs · 7 daily indicators · AI signal"}
            </p>
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            loading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-trade text-black hover:opacity-90",
          )}
        >
          {loading ? (
            <><IconLoader2 size={13} className="animate-spin" /> Analyzing...</>
          ) : (
            <><IconBrain size={13} /> Analyze</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[11px] text-[#ff4466] bg-[#ff4466]/5 border border-[#ff4466]/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Results table */}
      {results && results.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left  px-2 py-2 font-medium">Currency</th>
                <th className="text-right px-2 py-2 font-medium">1 USD =</th>
                <th className="text-right px-2 py-2 font-medium">Δ%</th>
                <th className="text-center px-2 py-2 font-medium" title="7 indicator dots: green=BUY · red=SELL · gray=NEUTRAL">
                  Indicators
                </th>
                <th className="text-center px-2 py-2 font-medium">Score</th>
                <th className="text-center px-2 py-2 font-medium">AI Signal</th>
                <th className="text-center px-2 py-2 font-medium">Conf.</th>
                <th className="text-right px-2 py-2 font-medium">Predicted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const meta    = CURRENCY_META[r.code];
                const ind     = r.indicators;
                const details = getIndicatorDetails(ind);
                const chgPos  = ind.changePercent >= 0;
                // predicted: for USD/XXX, lower = foreign stronger = good if BUY
                const predDiff  = r.predictedPrice - ind.currentPrice;
                const predColor = predDiff < 0 ? "text-[#00ff88]" : "text-[#ff4466]";
                const isExpanded = expandedRow === r.code;

                return (
                  <Fragment key={r.code}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : r.code)}
                      className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      {/* Currency */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{meta?.flag}</span>
                          <div>
                            <span className="font-mono font-bold text-foreground">{r.code}</span>
                            <span className="text-muted-foreground ml-1 text-[10px] hidden sm:inline">
                              {meta?.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="px-2 py-2 text-right font-mono text-foreground">
                        {fmtRate(ind.currentPrice)}
                      </td>

                      {/* Change % */}
                      <td className={cn("px-2 py-2 text-right font-mono",
                        chgPos ? "text-muted-foreground" : "text-[#00ff88]"
                      )}>
                        {fmtPct(ind.changePercent)}
                      </td>

                      {/* 7 indicator dots */}
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {details.map((d) => (
                            <SignalDot
                              key={d.label}
                              signal={d.signal}
                              title={`${d.label}: ${d.signal} — ${d.reason}`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-2 py-2 text-center">
                        <Score details={details} />
                      </td>

                      {/* AI Signal */}
                      <td className="px-2 py-2 text-center">
                        <SignalBadge signal={r.signal} />
                      </td>

                      {/* Confidence */}
                      <td className="px-2 py-2">
                        <ConfidenceBar value={r.confidence} />
                      </td>

                      {/* Predicted */}
                      <td className={cn("px-2 py-2 text-right font-mono", predColor)}>
                        {fmtRate(r.predictedPrice)}
                      </td>
                    </tr>

                    {/* Expanded: per-indicator breakdown */}
                    {isExpanded && (
                      <tr className="bg-muted/20 border-b border-border/50">
                        <td colSpan={8} className="px-4 py-3 space-y-3">
                          {/* Indicator rows */}
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-[10px] text-muted-foreground border-b border-border/40">
                                <th className="text-left pb-1 font-medium w-28">Indicator</th>
                                <th className="text-center pb-1 font-medium w-16">Signal</th>
                                <th className="text-left pb-1 font-medium w-32 pl-3">Value</th>
                                <th className="text-left pb-1 font-medium pl-3">Why</th>
                              </tr>
                            </thead>
                            <tbody>
                              {details.map((d) => (
                                <tr key={d.label} className="border-b border-border/20 last:border-0">
                                  <td className="py-1.5 font-medium text-foreground">{d.label}</td>
                                  <td className="py-1.5 text-center">
                                    <SignalBadge signal={d.signal} size="sm" />
                                  </td>
                                  <td className="py-1.5 pl-3 font-mono text-muted-foreground">{d.value}</td>
                                  <td className="py-1.5 pl-3 text-muted-foreground">{d.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* AI reasoning */}
                          <p className="text-[11px] text-muted-foreground italic leading-relaxed border-t border-border/30 pt-2">
                            <span className="text-foreground font-medium not-italic">AI: </span>
                            {r.reasoning}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Click a row to see per-indicator breakdown · Dots: <span className="text-[#00ff88]">● BUY</span> <span className="text-[#ff4466]">● SELL</span> <span className="text-zinc-400">● NEUTRAL</span> · BUY = foreign currency expected to strengthen vs USD
          </p>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="text-center py-8 text-muted-foreground text-[11px]">
          Press <span className="font-semibold">Analyze</span> to run AI analysis on 19 currency pairs using 7 daily trading indicators
        </div>
      )}

      {/* Indicator guide */}
      <div className="border-t border-border pt-3">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {guideOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
          How signals are calculated (7 indicators)
        </button>
        {guideOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INDICATOR_GUIDE.map((g) => (
              <div key={g.name} className="rounded-lg bg-muted/50 px-3 py-2 space-y-1">
                <p className="text-[11px] font-semibold text-foreground">{g.name}</p>
                <p className="text-[10px] text-muted-foreground">{g.short}</p>
                <div className="space-y-0.5 pt-0.5">
                  <p className="text-[10px] text-[#00ff88]">↑ BUY: {g.buy}</p>
                  <p className="text-[10px] text-[#ff4466]">↓ SELL: {g.sell}</p>
                  <p className="text-[10px] text-zinc-400">─ NEUTRAL: {g.neutral}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
