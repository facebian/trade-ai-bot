import { NextResponse } from "next/server";
import { stopBot } from "@/lib/bot";

export async function POST() {
  try {
    await stopBot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
