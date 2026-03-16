import { NextResponse } from "next/server";
import { runAnalysisCycle, getBotState } from "@/lib/bot";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (vercel.json) every N minutes.
// Also callable manually for local testing.
export async function POST(request: Request) {
  // Protect with CRON_SECRET so only Vercel (or you) can trigger it
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getBotState();
  if (state.status !== "running") {
    return NextResponse.json({ skipped: true, reason: "bot not running" });
  }

  await runAnalysisCycle();
  return NextResponse.json({ ok: true });
}
