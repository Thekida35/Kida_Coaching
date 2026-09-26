import { NextRequest, NextResponse } from "next/server";
import { deleteInbox, getInbox, markInboxSeen } from "@/lib/hub/inbox";

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

/** DELETE ?id=… : supprime une notification ; sans id : les supprime toutes. */
export async function DELETE(req: NextRequest) {
  await deleteInbox(req.nextUrl.searchParams.get("id") ?? undefined);
  return NextResponse.json(await getInbox());
}
