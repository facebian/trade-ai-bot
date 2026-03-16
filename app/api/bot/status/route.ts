import { NextResponse } from "next/server";
import { getBotState, syncBalance } from "@/lib/bot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncBalance();
    return NextResponse.json(getBotState());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
