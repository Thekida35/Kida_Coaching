import { NextResponse } from "next/server";
import { getInbox, markInboxSeen } from "@/lib/hub/inbox";

export const runtime = "nodejs";

/** Notifications reçues (cloche) et nombre de non lues. */
export async function GET() {
  return NextResponse.json(await getInbox());
}

/** Tout marquer comme lu. */
export async function POST() {
  await markInboxSeen();
  return NextResponse.json({ ok: true });
}
