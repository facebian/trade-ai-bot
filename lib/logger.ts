import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
// Vercel and other serverless platforms have a read-only filesystem
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

function appendToFile(filename: string, entry: string) {
  if (IS_SERVERLESS) return; // skip file writes on serverless
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, filename), entry);
  } catch {
    // silently ignore filesystem errors (e.g. read-only fs)
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

  console.log(entry.trim());
  appendToFile("trades.log", entry);
}

export function logClaude(data: {
  prompt: string;
  rawResponse: string;
  decision: string;
  confidence: number;
}) {
  const timestamp = new Date().toISOString();
  const entry =
    `\n${"═".repeat(80)}\n` +
    `[${timestamp}] CLAUDE  decision=${data.decision}  confidence=${data.confidence}%\n` +
    `${"─".repeat(40)} PROMPT ${"─".repeat(33)}\n` +
    `${data.prompt}\n` +
    `${"─".repeat(40)} RESPONSE ${"─".repeat(31)}\n` +
    `${data.rawResponse}\n`;

  console.log(`[CLAUDE] decision=${data.decision} confidence=${data.confidence}%`);
  appendToFile("claude.log", entry);
}
