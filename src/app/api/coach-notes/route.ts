import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/hub/db";
import { DEFAULT_NOTES } from "@/lib/hub/coachContext";

export const runtime = "nodejs";

/** Notes libres lues par le coach (profil, contraintes, blessures…). */
export async function GET() {
  return NextResponse.json({ notes: (await kvGet<string>("coach_notes")) ?? DEFAULT_NOTES });
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (typeof b?.notes !== "string") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  await kvSet("coach_notes", b.notes.slice(0, 20000));
  return NextResponse.json({ ok: true });
}
