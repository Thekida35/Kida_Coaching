import { NextRequest, NextResponse } from "next/server";
import { checkCode, setCode, validCode } from "@/lib/hub/code";

export const runtime = "nodejs";

/** PUT { current, next } : change le code d'accès (4 à 6 chiffres). */
export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!validCode(b?.next)) return NextResponse.json({ error: "Le nouveau code doit faire 4 à 6 chiffres." }, { status: 400 });
  if ((await checkCode(String(b?.current ?? ""))) !== true) return NextResponse.json({ error: "Code actuel incorrect." }, { status: 403 });
  await setCode(b.next);
  return NextResponse.json({ ok: true });
}
