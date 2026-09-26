import { kvGet, kvSet } from "@/lib/hub/db";

type Tok = { access_token: string; refresh_token: string; expires_at: number; athlete?: { firstname?: string } };
export class NotConnected extends Error {}

export function stravaConfigured() {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export async function saveTokens(t: Tok) {
  await kvSet("strava", { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, athlete: t.athlete?.firstname ?? null });
}

async function token(): Promise<string> {
  const t = await kvGet<Tok>("strava");
  if (!t) throw new NotConnected();
  if (t.expires_at * 1000 > Date.now() + 60e3) return t.access_token;
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: t.refresh_token }),
  });
  if (!r.ok) throw new NotConnected();
  const n = (await r.json()) as Tok;
  await saveTokens({ ...n, athlete: t.athlete as Tok["athlete"] });
  return n.access_token;
}

export async function api(path: string) {
  const r = await fetch(`https://www.strava.com/api/v3${path}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
  if (r.status === 401) throw new NotConnected();
  if (!r.ok) throw new Error(`strava ${r.status}`);
  return r.json();
}

type Act = { id: number; name: string; sport_type: string; start_date_local: string; description?: string; distance: number; moving_time: number; elapsed_time: number; suffer_score?: number; workout_type?: number; average_heartrate?: number; max_heartrate?: number; total_elevation_gain?: number };

/** Même forme que les activités lues par le hub (connecteur Strava). */
export function mapAct(a: Act) {
  return {
    id: String(a.id),
    name: a.name,
    description: a.description ?? "",
    sport_type: a.sport_type,
    start_local: (a.start_date_local ?? "").replace("Z", ""),
    activity_tags: a.workout_type === 1 ? ["Race"] : [],
    summary: {
      distance: a.distance, moving_time: a.moving_time, elapsed_time: a.elapsed_time, relative_effort: a.suffer_score ?? null,
      avg_hr: a.average_heartrate ?? null, max_hr: a.max_heartrate ?? null, elev: a.total_elevation_gain ?? null,
    },
  };
}
