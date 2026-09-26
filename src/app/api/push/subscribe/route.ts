import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/hub/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const s = await req.json().catch(() => null);
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
  await prisma.pushSub.upsert({ where: { endpoint: s.endpoint }, create: { endpoint: s.endpoint, keys: s.keys }, update: { keys: s.keys } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const s = await req.json().catch(() => null);
  if (s?.endpoint) await prisma.pushSub.deleteMany({ where: { endpoint: s.endpoint } });
  return NextResponse.json({ ok: true });
}
