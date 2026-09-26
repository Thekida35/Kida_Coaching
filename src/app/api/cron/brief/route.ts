import { NextRequest, NextResponse } from "next/server";
import { buildBrief } from "@/lib/hub/brief";
import { sendAll } from "@/lib/hub/push";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await buildBrief();
  if (!b) return NextResponse.json({ skipped: "no_race_in_10_days" });
  return NextResponse.json(await sendAll(b));
}
