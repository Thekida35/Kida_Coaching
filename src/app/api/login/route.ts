import { NextRequest, NextResponse } from "next/server";
import { COOKIE, makeToken } from "@/lib/hub/auth";

export const runtime = "nodejs";
const tries = new Map<string, { n: number; t: number }>();

export async function POST(req: NextRequest) {
  const code = process.env.APP_CODE;
  if (!code) return NextResponse.json({ error: "Le code d'accès n'est pas encore configuré (APP_CODE sur Vercel)." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "?";
  const t = tries.get(ip);
  if (t && t.n >= 5 && Date.now() - t.t < 5 * 60e3) return NextResponse.json({ error: "Trop d'essais. Réessaie dans 5 minutes." }, { status: 429 });
  const { code: given } = await req.json().catch(() => ({ code: "" }));
  const a = String(given ?? ""), b = String(code);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  if (diff !== 0) {
    tries.set(ip, { n: (t && Date.now() - t.t < 5 * 60e3 ? t.n : 0) + 1, t: Date.now() });
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }
  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 180 * 86400 });
  return res;
}
