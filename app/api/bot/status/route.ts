import { NextResponse } from "next/server";
import { getBotState, syncBalance } from "@/lib/bot";

export const dynamic = "force-dynamic";

export async function GET() {
  await syncBalance();
  return NextResponse.json(getBotState());
}
