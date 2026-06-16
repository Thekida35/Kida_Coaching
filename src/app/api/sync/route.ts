import { NextRequest, NextResponse } from "next/server";
import { syncFromStrava } from "@/lib/ingest/sync";

export const runtime = "nodejs";

/**
 * POST /api/sync  { limit?: number }
 * Tire les dernières activités Strava via le MCP GetFast (voie conforme),
 * les enregistre et recalcule la forme. Idéal à appeler aussi depuis un cron.
 */
export async function POST(req: NextRequest) {
  try {
    const { limit } = await req.json().catch(() => ({ limit: 30 }));
    const count = await syncFromStrava(typeof limit === "number" ? limit : 30);
    return NextResponse.json({ ok: true, synced: count });
  } catch (err) {
    console.error("[/api/sync]", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
