"use client";

import type { NetworkMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconArrowsExchange } from "@tabler/icons-react";

interface NetworkBadgeProps {
  network: NetworkMode;
  onSwitch: (next: NetworkMode) => Promise<void>;
  disabled?: boolean;
}

export function NetworkBadge({ network, onSwitch, disabled }: NetworkBadgeProps) {
  const isTestnet = network === "testnet";
  const next: NetworkMode = isTestnet ? "mainnet" : "testnet";

  return (
    <button
      onClick={() => onSwitch(next)}
      disabled={disabled}
      title={`Switch to ${next}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isTestnet
          ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
          : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isTestnet ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {network.toUpperCase()}
      <IconArrowsExchange size={11} className="opacity-60" />
    </button>
  );
}
