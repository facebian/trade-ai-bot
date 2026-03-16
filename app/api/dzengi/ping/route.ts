import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.DZENGI_BASE_URL}/api/v1/time`, {
      next: { revalidate: 0 },
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "error",
          error: `HTTP ${res.status}`,
          latencyMs,
          checkedAt: Date.now(),
        },
        { status: 200 },
      );
    }

    const data = await res.json();

    return NextResponse.json({
      status: "ok",
      latencyMs,
      serverTime: data.serverTime ?? null,
      checkedAt: Date.now(),
      endpoint: process.env.DZENGI_BASE_URL,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
      checkedAt: Date.now(),
      endpoint: process.env.DZENGI_BASE_URL,
    });
  }
}
