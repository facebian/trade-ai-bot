"use server";
import { supabase } from "@/lib/supabase";

export async function getConfig() {
  const { data } = await supabase.from("bot_config").select("*").single();
  return data;
}

export type BotConfig = {
  id?: string;
  trading_pair: string;
  position_size: number;
  candle_timeframe: string;
  analysis_interval_min: number;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  min_confidence: number;
  claude_model: string;
  is_active: boolean;
  updated_at?: string;
};

export async function saveConfig(
  config: Omit<BotConfig, "id" | "updated_at"> & { id: string },
) {
  const { id, ...fields } = config;
  const { data } = await supabase
    .from("bot_config")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return data;
}
