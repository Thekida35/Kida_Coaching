import { NextRequest, NextResponse } from "next/server";
import { api, mapAct, NotConnected } from "@/lib/hub/strava";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const per = Math.min(Math.max(+(q.get("first") ?? 10) || 10, 1), 50);
  const rs = q.get("range_start"), re = q.get("range_end");
  let path = `/athlete/activities?per_page=${per}`;
  if (rs) path += `&after=${Math.floor(new Date(rs + "Z").getTime() / 1000) - 14 * 3600}`;
  if (re) path += `&before=${Math.floor(new Date(re + "Z").getTime() / 1000) + 14 * 3600}`;
  try {
    let acts = ((await api(path)) as Parameters<typeof mapAct>[0][]).map(mapAct);
    if (rs || re) {
      const d0 = rs?.slice(0, 10), d1 = re?.slice(0, 10);
      acts = acts.filter((a) => (!d0 || a.start_local.slice(0, 10) >= d0) && (!d1 || a.start_local.slice(0, 10) <= d1));
      acts = await Promise.all(acts.slice(0, 5).map(async (a) => ({ ...a, description: ((await api(`/activities/${a.id}`)) as { description?: string }).description ?? "" })));
    }
    return NextResponse.json({ activities: acts });
  } catch (e) {
    if (e instanceof NotConnected) return NextResponse.json({ error: "server_not_connected" }, { status: 409 });
    return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  }
}
