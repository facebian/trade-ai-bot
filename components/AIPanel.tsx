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
  IconLoader2,
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
    <div className='rounded-lg border border-trade/30 bg-trade/5 p-3'>
      <p className='text-[11px] font-bold text-trade mb-2.5 uppercase tracking-wider'>
        Open Position
      </p>
      <div className='grid grid-cols-2 gap-y-1.5 text-xs'>
        <span className='text-muted-foreground'>Pair</span>
        <span className='font-mono font-bold text-right'>{position.pair}</span>

        <span className='text-muted-foreground'>Entry price</span>
        <span className='font-mono text-right'>
          $
          {position.entryPrice.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}
        </span>

        <span className='text-muted-foreground'>Current price</span>
        <span className='font-mono text-right'>
          $
          {position.currentPrice.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}
        </span>

        <span className='text-muted-foreground'>Amount</span>
        <span className='font-mono text-right'>
          {position.amount.toFixed(6)} BTC
        </span>

        <span className='text-muted-foreground'>P&L</span>
        <span
          className={cn(
            "font-mono font-bold text-right",
            pnlPositive ? "text-buy" : "text-sell",
          )}
        >
          {pnlSign}${position.pnl.toFixed(2)} ({pnlSign}
          {position.pnlPercent.toFixed(2)}%)
        </span>

        {position.stopLoss != null && (
          <>
            <span className='text-muted-foreground'>Stop loss</span>
            <span className='font-mono text-sell text-right'>
              ${position.stopLoss}
            </span>
          </>
        )}
        {position.takeProfit != null && (
          <>
            <span className='text-muted-foreground'>Take profit</span>
            <span className='font-mono text-buy text-right'>
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
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <DecisionBadge decision={analysis.decision} />
        <div className='text-right'>
          <p className='text-[11px] text-muted-foreground'>Confidence</p>
          <div className='flex items-center gap-2 mt-0.5'>
            <div className='w-20 h-1.5 bg-muted rounded-full overflow-hidden'>
              <div
                className='h-full rounded-full bg-trade transition-all'
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
            <span className='text-xs font-mono font-bold'>
              {analysis.confidence}%
            </span>
          </div>
        </div>
      </div>

      <p className='text-sm text-foreground/80 leading-relaxed'>
        {analysis.reasoning}
      </p>

      {analysis.keyFactors.length > 0 && (
        <div className='space-y-1'>
          <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
            Key factors
          </p>
          <ul className='space-y-0.5'>
            {analysis.keyFactors.map((factor, i) => (
              <li key={i} className='text-xs text-foreground/70 flex gap-1.5'>
                <span className='text-trade shrink-0 mt-px'>›</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className='flex items-center gap-4 text-xs text-muted-foreground pt-0.5'>
        <span className='font-mono'>
          Risk:{" "}
          <span
            className={cn("font-bold", {
              "text-buy": analysis.riskLevel === "LOW",
              "text-yellow-500": analysis.riskLevel === "MEDIUM",
              "text-sell": analysis.riskLevel === "HIGH",
            })}
          >
            {analysis.riskLevel}
          </span>
        </span>
        <span className='font-mono'>Size: {analysis.suggestedSize}%</span>
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
  const isStopped = botState.status === "stopped";

  const statusDotClass = isRunning
    ? "bg-[#00ff88] shadow-[0_0_6px_#00ff88] animate-pulse"
    : isError
      ? "bg-[#ff4466] shadow-[0_0_6px_#ff4466]"
      : "bg-zinc-300";

  return (
    <div className='rounded-xl border border-border bg-card p-5 flex flex-col gap-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <IconBrain size={17} className='text-trade' />
          <h2 className='font-semibold text-sm'>Claude AI</h2>
          <div className={cn("w-2 h-2 rounded-full", statusDotClass)} />
          <span className='text-xs text-muted-foreground capitalize'>
            {botState.status}
          </span>
        </div>

        {isStopped ? (
          <Button
            size='sm'
            onClick={onStart}
            disabled={actionPending}
            className='h-8 bg-buy hover:bg-[#00dd77] text-black font-bold text-xs gap-1.5 shadow-none'
          >
            {actionPending ? (
              <IconLoader2 size={12} className='animate-spin' />
            ) : (
              <IconPlayerPlay size={12} />
            )}
            {actionPending ? "Starting..." : "Start"}
          </Button>
        ) : (
          <Button
            size='sm'
            variant='outline'
            onClick={onStop}
            disabled={actionPending}
            className='h-8 border-sell/50 text-sell hover:bg-sell/10 hover:text-sell text-xs gap-1.5 shadow-none'
          >
            {actionPending ? (
              <IconLoader2 size={12} className='animate-spin' />
            ) : (
              <IconPlayerStop size={12} />
            )}
            {actionPending ? "Stopping..." : "Stop"}
          </Button>
        )}
      </div>

      {/* Error message */}
      {isError && botState.lastError && (
        <div className='rounded-lg border border-sell/30 bg-sell/5 px-3 py-2'>
          <p className='text-[11px] font-bold text-sell mb-1 uppercase tracking-wider'>
            Error
          </p>
          <p className='text-xs text-foreground/70 font-mono break-all'>
            {botState.lastError}
          </p>
        </div>
      )}

      {/* Analysis */}
      {botState.lastAnalysis ? (
        <AnalysisSection analysis={botState.lastAnalysis} />
      ) : (
        <div className='py-8 text-center text-sm text-muted-foreground'>
          {isRunning ? (
            <span className='flex items-center justify-center gap-2'>
              <IconLoader2 size={14} className='animate-spin' />
              Analyzing market...
            </span>
          ) : (
            "Start the bot to begin analysis"
          )}
        </div>
      )}

      {/* Open position */}
      {botState.position && <PositionCard position={botState.position} />}
    </div>
  );
}
