import { NextResponse } from "next/server";
import { api, NotConnected } from "@/lib/hub/strava";
import { kvGet, kvSet } from "@/lib/hub/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Shoe = { id: string; name: string; distance: number };
type Gear = { brand_name?: string; model_name?: string; name?: string; retired?: boolean; distance: number };

export async function GET() {
  try {
    const cache = await kvGet<{ at: number; gear: unknown[] }>("gear");
    if (cache && Date.now() - cache.at < 3600e3) return NextResponse.json({ gear: cache.gear });
    const me = (await api("/athlete")) as { shoes?: Shoe[] };
    const gear = await Promise.all((me.shoes ?? []).map(async (s) => {
      const g = (await api(`/gear/${s.id}`)) as Gear;
      return { gear_id: { id: s.id, gear_type: "Shoe" }, brand: g.brand_name ?? "", model_name: g.model_name || g.name || s.name, retired: !!g.retired, total_distance: g.distance ?? s.distance };
    }));
    await kvSet("gear", { at: Date.now(), gear });
    return NextResponse.json({ gear });
  } catch (e) {
    if (e instanceof NotConnected) return NextResponse.json({ error: "server_not_connected" }, { status: 409 });
    return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  }
}
