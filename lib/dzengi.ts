import crypto from "crypto";

export const DZENGI_BASE_URL =
  process.env.DZENGI_BASE_URL ?? "https://api-adapter.dzengi.com/";

export interface DzengiBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface DzengiAccountData {
  status: "ok" | "error";
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  updateTime?: number;
  balances?: DzengiBalance[];
  fetchedAt: number;
  error?: string;
}

export async function fetchDzengiAccount(): Promise<DzengiAccountData> {
  try {
    const raw = await dzengiPrivateGet("/api/v1/account");
    return {
      status: "ok",
      canTrade: raw.canTrade,
      canWithdraw: raw.canWithdraw,
      canDeposit: raw.canDeposit,
      updateTime: raw.updateTime,
      balances: (raw.balances as DzengiBalance[]).filter(
        (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
      ),
      fetchedAt: Date.now(),
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      fetchedAt: Date.now(),
    };
  }
}

export const DZENGI_API_KEY = process.env.DZENGI_API_KEY ?? "";
export const DZENGI_SECRET = process.env.DZENGI_SECRET_KEY ?? "";

export function signParams(
  params: Record<string, string | number>,
  secret: string,
): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const sig = crypto.createHmac("sha256", secret).update(qs).digest("hex");
  return `${qs}&signature=${sig}`;
}

export async function dzengiPrivateGet(
  path: string,
  params: Record<string, string | number> = {},
) {
  const signed = signParams(
    { ...params, timestamp: Date.now() },
    DZENGI_SECRET,
  );
  const base = DZENGI_BASE_URL.replace(/\/$/, "");

  const res = await fetch(`${base}${path}?${signed}`, {
    headers: { "X-MBX-APIKEY": DZENGI_API_KEY },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dzengi ${path}: HTTP ${res.status} — ${text}`);
  }
  return res.json();
}
