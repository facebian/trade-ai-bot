"use client";

import type { BotState, ClaudeAnalysis, Position } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconBrain,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react";

interface AIPanelProps {
  botState: BotState;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  actionPending: boolean;
}

function DecisionBadge({ decision }: { decision: "BUY" | "SELL" | "HOLD" }) {
  const styles = {
    BUY: "bg-[#00ff88]/15 text-[#009955] border-[#00ff88]/40",
    SELL: "bg-[#ff4466]/15 text-[#cc2244] border-[#ff4466]/40",
    HOLD: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };
  const icons = {
    BUY: <IconTrendingUp size={13} />,
    SELL: <IconTrendingDown size={13} />,
    HOLD: <IconMinus size={13} />,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border font-mono tracking-widest",
        styles[decision],
      )}
    >
      {icons[decision]}
      {decision}
    </span>
  );
}

function PositionCard({ position }: { position: Position }) {
  const pnlPositive = position.pnl >= 0;
  const pnlSign = pnlPositive ? "+" : "";
  return (
    <div className="rounded-lg border border-[#4488ff]/30 bg-[#4488ff]/5 p-3">
      <p className="text-[11px] font-bold text-[#4488ff] mb-2.5 uppercase tracking-wider">
        Open Position
      </p>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Pair</span>
        <span className="font-mono font-bold text-right">{position.pair}</span>

        <span className="text-muted-foreground">Entry price</span>
        <span className="font-mono text-right">
          ${position.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>

        <span className="text-muted-foreground">Current price</span>
        <span className="font-mono text-right">
          ${position.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>

        <span className="text-muted-foreground">Amount</span>
        <span className="font-mono text-right">{position.amount.toFixed(6)} BTC</span>

        <span className="text-muted-foreground">P&L</span>
        <span
          className={cn(
            "font-mono font-bold text-right",
            pnlPositive ? "text-[#00ff88]" : "text-[#ff4466]",
          )}
        >
          {pnlSign}${position.pnl.toFixed(2)} ({pnlSign}
          {position.pnlPercent.toFixed(2)}%)
        </span>

        {position.stopLoss != null && (
          <>
            <span className="text-muted-foreground">Stop loss</span>
            <span className="font-mono text-[#ff4466] text-right">
              ${position.stopLoss}
            </span>
          </>
        )}
        {position.takeProfit != null && (
          <>
            <span className="text-muted-foreground">Take profit</span>
            <span className="font-mono text-[#00ff88] text-right">
              ${position.takeProfit}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function AnalysisSection({ analysis }: { analysis: ClaudeAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <DecisionBadge decision={analysis.decision} />
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Confidence</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4488ff] transition-all"
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold">
              {analysis.confidence}%
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">
        {analysis.reasoning}
      </p>

      {analysis.keyFactors.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Key factors
          </p>
          <ul className="space-y-0.5">
            {analysis.keyFactors.map((factor, i) => (
              <li key={i} className="text-xs text-foreground/70 flex gap-1.5">
                <span className="text-[#4488ff] shrink-0 mt-px">›</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
        <span className="font-mono">
          Risk:{" "}
          <span
            className={cn("font-bold", {
              "text-[#00ff88]": analysis.riskLevel === "LOW",
              "text-yellow-500": analysis.riskLevel === "MEDIUM",
              "text-[#ff4466]": analysis.riskLevel === "HIGH",
            })}
          >
            {analysis.riskLevel}
          </span>
        </span>
        <span className="font-mono">Size: {analysis.suggestedSize}%</span>
      </div>
    </div>
  );
}

export function AIPanel({
  botState,
  onStart,
  onStop,
  actionPending,
}: AIPanelProps) {
  const isRunning = botState.status === "running";
  const isError = botState.status === "error";

  const statusDotClass = isRunning
    ? "bg-[#00ff88] shadow-[0_0_6px_#00ff88]"
    : isError
      ? "bg-[#ff4466] shadow-[0_0_6px_#ff4466]"
      : "bg-zinc-300";

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBrain size={17} className="text-[#4488ff]" />
          <h2 className="font-semibold text-sm">Claude AI</h2>
          <div className={cn("w-2 h-2 rounded-full", statusDotClass)} />
          <span className="text-xs text-muted-foreground capitalize">
            {botState.status}
          </span>
        </div>

        {!isRunning ? (
          <Button
            size="sm"
            onClick={onStart}
            disabled={actionPending}
            className="h-8 bg-[#00ff88] hover:bg-[#00dd77] text-black font-bold text-xs gap-1.5 shadow-none"
          >
            <IconPlayerPlay size={12} />
            Start
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            disabled={actionPending}
            className="h-8 border-[#ff4466]/50 text-[#ff4466] hover:bg-[#ff4466]/10 hover:text-[#ff4466] text-xs gap-1.5 shadow-none"
          >
            <IconPlayerStop size={12} />
            Stop
          </Button>
        )}
      </div>

      {/* Analysis */}
      {botState.lastAnalysis ? (
        <AnalysisSection analysis={botState.lastAnalysis} />
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {isRunning ? "Analyzing market..." : "Start the bot to begin analysis"}
        </div>
      )}

      {/* Open position */}
      {botState.position && <PositionCard position={botState.position} />}
    </div>
  );
}
