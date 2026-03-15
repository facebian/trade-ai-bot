import { NextResponse } from "next/server";
import { closePosition, getBotState } from "@/lib/bot";
import { HttpMethods } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(_req: Request) {
  if (_req.method !== HttpMethods.POST) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    await closePosition();
    return NextResponse.json(getBotState());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
