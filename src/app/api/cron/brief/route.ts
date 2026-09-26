import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/lib/hub/notify";

export const runtime = "nodejs";

/** Appelé par Vercel Cron (1×/jour) et par GitHub Actions (toutes les 30 min) : voir lib/hub/notify. */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json(await runTick());
}
