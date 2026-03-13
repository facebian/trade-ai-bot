import { NextResponse } from "next/server";
import { setNetwork, getBotState } from "@/lib/bot";
import type { NetworkMode } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { network } = (await req.json()) as { network: NetworkMode };

    console.log("network : >>>", network);

    if (network !== "testnet" && network !== "mainnet") {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 });
    }
    setNetwork(network);
    return NextResponse.json(getBotState());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
