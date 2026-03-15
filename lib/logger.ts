import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logTrade(data: {
  type: "BUY" | "SELL";
  pair: string;
  price: number;
  amount: number;
  total: number;
  pnl?: number | null;
  pnlPercent?: number | null;
  reasoning: string;
}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const pnlStr =
    data.pnl != null
      ? ` | P&L: ${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)} (${data.pnlPercent?.toFixed(2)}%)`
      : "";
  const entry =
    `[${timestamp}] TRADE ${data.type} ${data.pair}` +
    ` @ $${data.price.toFixed(2)}` +
    ` | Amount: ${data.amount.toFixed(6)}` +
    ` | Total: $${data.total.toFixed(2)}` +
    `${pnlStr}\n` +
    `  Reasoning: ${data.reasoning}\n\n`;

  fs.appendFileSync(path.join(LOG_DIR, "trades.log"), entry);
}

export function logClaude(data: {
  prompt: string;
  rawResponse: string;
  decision: string;
  confidence: number;
}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry =
    `\n${"═".repeat(80)}\n` +
    `[${timestamp}] CLAUDE  decision=${data.decision}  confidence=${data.confidence}%\n` +
    `${"─".repeat(40)} PROMPT ${"─".repeat(33)}\n` +
    `${data.prompt}\n` +
    `${"─".repeat(40)} RESPONSE ${"─".repeat(31)}\n` +
    `${data.rawResponse}\n`;

  fs.appendFileSync(path.join(LOG_DIR, "claude.log"), entry);
}
