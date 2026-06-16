import { NextRequest, NextResponse } from "next/server";
import { runDailyJob } from "@/lib/jobs/daily";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/daily
 * Déclenché par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET :
 * Vercel envoie l'en-tête "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/cron/daily]", err);
    return NextResponse.json({ error: "daily_job_failed" }, { status: 500 });
  }
}
