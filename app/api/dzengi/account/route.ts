import { NextResponse } from "next/server";
import { dzengiPrivateGet } from "@/lib/dzengi";

export interface DzengiBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface DzengiAccountData {
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  balances: DzengiBalance[];
}

export async function GET() {
  try {
    const data: DzengiAccountData = await dzengiPrivateGet("/api/v1/account");

    // Filter out zero balances
    const nonZero = data.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
    );

    return NextResponse.json({
      status: "ok",
      canTrade: data.canTrade,
      canWithdraw: data.canWithdraw,
      canDeposit: data.canDeposit,
      updateTime: data.updateTime,
      balances: nonZero,
      fetchedAt: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        fetchedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
