import { NextResponse } from "next/server";
import { startBot } from "@/lib/bot";

export async function POST() {
  try {
    await startBot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
