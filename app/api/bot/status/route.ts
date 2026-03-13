import { NextResponse } from "next/server";
import { getBotState } from "@/lib/bot";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getBotState());
}
