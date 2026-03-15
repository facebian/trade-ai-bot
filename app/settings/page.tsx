"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getConfig, saveConfig, type BotConfig } from "@/app/actions/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconActivity, IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";

const CLAUDE_MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fast, cheap)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6 (powerful)" },
];

const TRADING_PAIRS = [
  { value: "BTC/USDC", label: "BTC/USDC" },
  { value: "ETH/USDC", label: "ETH/USDC" },
  { value: "SOL/USDC", label: "SOL/USDC" },
];

const TIMEFRAMES = [
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "1h", label: "1 hour" },
];

type FormState = Omit<BotConfig, "id" | "updated_at"> & { id: string };

const DEFAULTS: Omit<FormState, "id"> = {
  trading_pair: "BTC/USDC",
  position_size: 10,
  candle_timeframe: "5m",
  analysis_interval_min: 5,
  stop_loss_pct: null,
  take_profit_pct: null,
  min_confidence: 60,
  claude_model: "claude-haiku-4-5-20251001",
  is_active: false,
};

export default function SettingsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getConfig().then((data) => {
      if (data) {
        setForm({ ...DEFAULTS, ...data, id: data.id as string });
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => prev && { ...prev, [key]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    startTransition(async () => {
      await saveConfig(form);
      toast.success("Config saved");
    });
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-muted-foreground text-sm font-mono animate-pulse">Loading config...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconActivity size={18} className="text-trade" />
            <span className="text-base font-bold tracking-tight">TradeAI</span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Settings</span>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shadow-none">
              <IconArrowLeft size={12} />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Trading */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Trading</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trading_pair">Trading pair</Label>
                <Select
                  value={form.trading_pair}
                  onValueChange={(v) => set("trading_pair", v)}
                >
                  <SelectTrigger id="trading_pair" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADING_PAIRS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position_size">Position size (USDC)</Label>
                <Input
                  id="position_size"
                  type="number"
                  min={1}
                  step={1}
                  value={form.position_size}
                  onChange={(e) => set("position_size", Number(e.target.value))}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stop_loss_pct">Stop loss (%)</Label>
                <Input
                  id="stop_loss_pct"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="e.g. 2.5"
                  value={form.stop_loss_pct ?? ""}
                  onChange={(e) =>
                    set("stop_loss_pct", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="take_profit_pct">Take profit (%)</Label>
                <Input
                  id="take_profit_pct"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="e.g. 5"
                  value={form.take_profit_pct ?? ""}
                  onChange={(e) =>
                    set("take_profit_pct", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
          </section>

          {/* Analysis */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Analysis</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="candle_timeframe">Candle timeframe</Label>
                <Select
                  value={form.candle_timeframe}
                  onValueChange={(v) => set("candle_timeframe", v)}
                >
                  <SelectTrigger id="candle_timeframe" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="analysis_interval_min">Analysis interval (min)</Label>
                <Input
                  id="analysis_interval_min"
                  type="number"
                  min={1}
                  max={60}
                  value={form.analysis_interval_min}
                  onChange={(e) => set("analysis_interval_min", Number(e.target.value))}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="min_confidence">Min confidence (%)</Label>
                <Input
                  id="min_confidence"
                  type="number"
                  min={0}
                  max={100}
                  value={form.min_confidence}
                  onChange={(e) => set("min_confidence", Number(e.target.value))}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claude_model">Claude model</Label>
                <Select
                  value={form.claude_model}
                  onValueChange={(v) => set("claude_model", v)}
                >
                  <SelectTrigger id="claude_model" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAUDE_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-10 bg-buy hover:bg-[#00dd77] text-black font-bold gap-2 shadow-none"
          >
            <IconDeviceFloppy size={15} />
            {isPending ? "Saving..." : "Save config"}
          </Button>
        </form>
      </main>
    </div>
  );
}
