"use client";

import { cn } from "@/lib/utils";
import { IconArrowsExchange } from "@tabler/icons-react";

interface NetworkBadgeProps {
  disabled?: boolean;
}

export function NetworkBadge({ disabled }: NetworkBadgeProps) {
  return (
    <button
      onClick={() => {}}
      disabled={disabled}
      title={`Switch to `}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full")} />
      <IconArrowsExchange size={11} className='opacity-60' />
    </button>
  );
}
