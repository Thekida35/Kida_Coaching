import { NextResponse } from "next/server";
import { kvGet } from "@/lib/hub/db";
import { stravaConfigured } from "@/lib/hub/strava";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const t = await kvGet<{ athlete?: string }>("strava");
  return NextResponse.json({ configured: stravaConfigured(), connected: !!t, athlete: t?.athlete ?? null });
}
