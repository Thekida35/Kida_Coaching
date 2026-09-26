import { NextRequest, NextResponse } from "next/server";
import { COOKIE, makeToken } from "@/lib/hub/auth";
import { checkCode } from "@/lib/hub/code";

export const runtime = "nodejs";
const tries = new Map<string, { n: number; t: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "?";
  const t = tries.get(ip);
  if (t && t.n >= 5 && Date.now() - t.t < 5 * 60e3) return NextResponse.json({ error: "Trop d'essais. Réessaie dans 5 minutes." }, { status: 429 });
  const { code } = await req.json().catch(() => ({ code: "" }));
  const ok = await checkCode(String(code ?? ""));
  if (ok === null) return NextResponse.json({ error: "Le code d'accès n'est pas encore configuré (APP_CODE sur Vercel)." }, { status: 503 });
  if (!ok) {
    tries.set(ip, { n: (t && Date.now() - t.t < 5 * 60e3 ? t.n : 0) + 1, t: Date.now() });
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }
  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 180 * 86400 });
  return res;
}
