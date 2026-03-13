import { NextResponse } from "next/server";
import { stopBot } from "@/lib/bot";

export async function POST() {
  stopBot();
  return NextResponse.json({ success: true });
}
