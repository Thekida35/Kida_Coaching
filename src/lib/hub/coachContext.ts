import { readStore, kvGet, kvSet, prisma } from "@/lib/hub/db";
import { api, NotConnected } from "@/lib/hub/strava";

/** Profil de départ du coach : ce qu'on sait de Killian en dehors des chiffres. Modifiable depuis l'onglet Coach. */
export const DEFAULT_NOTES = `Killian, coureur sur route et trail, militaire (régiment), habite Saint-Aubin-du-Cormier (35), ~30 min de Rennes en voiture.
Contraintes : gardes régulières (journées sans course possible). Le footing régimentaire du lundi n'existe plus ; il peut courir le lundi soir. Séances clés plutôt le matin tôt.
Objectif du moment : Tout Rennes Court 10 km, 4 octobre 2026, 12h00, SAS 1, objectif sous 37:00 (A 36:45, B 37:00, C 37:30).
Repères physiologiques : seuil ~3:40-3:44/km, seuil lactique FC 179, FC max ~196, VO2max Garmin 61. Zones FC : Z2 126-156, Z3 157-172, Z4 173-187, Z5 au-dessus. Allure footing ~4:50-5:20/km.
Santé : gêne à l'ischio droit par le passé (Ultra Marin), tendon d'Achille à ménager (pas de sprints secs). Rhume fin septembre 2026 (passé). Signaux du matin : FC repos ≤ 47 et HRV ~66-86 ms = feu vert.
Matériel : Nike Alphafly 3 (courses et séances à allure 10 km), Adizero Evo SL (lignes droites), New Balance Hierro V9 (footings), Nike Vomero 18.
Nutrition course : caféine 2 mg/kg (~125 mg) 1 h avant, rien pendant un 10 km, rien de nouveau le jour J.
Style attendu : court, concret, en français, tutoiement. Pose une question si une info manque au lieu d'inventer.`;

const DAY = 864e5;
function parisDate(d = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}
const hms = (s: number) => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
};
const pace = (s: number, km: number) => (km ? hms(s / km) : "—");

type StravaAct = {
  id: number; name: string; sport_type: string; start_date_local: string; distance: number; moving_time: number; elapsed_time: number;
  total_elevation_gain?: number; average_heartrate?: number; max_heartrate?: number; suffer_score?: number; workout_type?: number;
};

/** Historique Strava 12 mois résumé en texte (mis en cache 20 min). */
async function stravaHistory(): Promise<string> {
  const cached = await kvGet<{ at: number; text: string }>("coach_strava");
  if (cached && Date.now() - cached.at < 20 * 60e3) return cached.text;
  const after = Math.floor((Date.now() - 365 * DAY) / 1000);
  const all: StravaAct[] = [];
  for (let page = 1; page <= 4; page++) {
    const batch = (await api(`/athlete/activities?after=${after}&per_page=200&page=${page}`)) as StravaAct[];
    all.push(...batch);
    if (batch.length < 200) break;
  }
  const runs = all.filter((a) => /Run/.test(a.sport_type)).sort((a, b) => (a.start_date_local < b.start_date_local ? -1 : 1));
  const others = all.length - runs.length;

  // Volume par semaine (lundi), 52 semaines
  const weeks = new Map<string, { km: number; n: number; s: number; long: number }>();
  for (const a of runs) {
    const d = new Date(a.start_date_local.slice(0, 10) + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    const w = weeks.get(k) ?? { km: 0, n: 0, s: 0, long: 0 };
    w.km += a.distance / 1000; w.n++; w.s += a.moving_time; w.long = Math.max(w.long, a.distance / 1000);
    weeks.set(k, w);
  }
  const wk = [...weeks.entries()].map(([k, w]) => `${k} : ${w.km.toFixed(0)} km, ${w.n} sorties, ${hms(w.s)}, plus longue ${w.long.toFixed(1)} km`);

  const line = (a: StravaAct) => {
    const km = a.distance / 1000;
    const tag = a.workout_type === 1 ? " [COURSE]" : a.workout_type === 3 ? " [SÉANCE]" : a.workout_type === 2 ? " [SORTIE LONGUE]" : "";
    return `${a.start_date_local.slice(0, 16).replace("T", " ")} · ${a.name}${tag} · ${km.toFixed(2)} km · ${hms(a.moving_time)} · ${pace(a.moving_time, km)}/km` +
      (a.average_heartrate ? ` · FC ${Math.round(a.average_heartrate)}/${Math.round(a.max_heartrate ?? 0)}` : "") +
      (a.total_elevation_gain ? ` · D+ ${Math.round(a.total_elevation_gain)} m` : "") +
      (a.suffer_score ? ` · effort ${a.suffer_score}` : "");
  };
  const since = new Date(Date.now() - 42 * DAY).toISOString().slice(0, 10);
  const recent = runs.filter((a) => a.start_date_local.slice(0, 10) >= since).map(line);
  const key = runs.filter((a) => a.start_date_local.slice(0, 10) < since && (a.workout_type === 1 || a.workout_type === 3 || a.distance >= 25000)).map(line);

  let totals = "";
  try {
    const me = (await api("/athlete")) as { id: number };
    const st = (await api(`/athletes/${me.id}/stats`)) as Record<string, { count: number; distance: number; moving_time: number; elevation_gain: number }>;
    const f = (x?: { count: number; distance: number; moving_time: number; elevation_gain: number }) =>
      x ? `${x.count} sorties, ${(x.distance / 1000).toFixed(0)} km, ${hms(x.moving_time)}, D+ ${Math.round(x.elevation_gain)} m` : "—";
    totals = `Totaux course à pied Strava — 4 dernières semaines : ${f(st.recent_run_totals)} · année : ${f(st.ytd_run_totals)} · depuis toujours : ${f(st.all_run_totals)}`;
  } catch {}

  const text = [
    totals,
    `Sur 12 mois : ${runs.length} sorties course à pied (${others} autres activités).`,
    `\nVOLUME PAR SEMAINE (semaine du lundi) :\n${wk.join("\n")}`,
    `\nSORTIES DES 6 DERNIÈRES SEMAINES (date · nom · distance · temps · allure · FC moy/max · D+ · effort relatif Strava) :\n${recent.join("\n")}`,
    key.length ? `\nCOURSES, SÉANCES ET SORTIES LONGUES PLUS ANCIENNES :\n${key.join("\n")}` : "",
  ].filter(Boolean).join("\n");
  await kvSet("coach_strava", { at: Date.now(), text });
  return text;
}

/** Données de l'ancien tableau (import Garmin) si présentes : métriques des 21 derniers jours. */
async function garminMetrics(): Promise<string> {
  try {
    const rows = await prisma.dailyMetric.findMany({ where: { date: { gte: new Date(Date.now() - 21 * DAY) } }, orderBy: { date: "asc" } });
    if (!rows.length) return "";
    return "MÉTRIQUES QUOTIDIENNES (import Garmin) :\n" + rows.map((r) =>
      [r.date.toISOString().slice(0, 10), r.ctl != null && `CTL ${r.ctl.toFixed(0)}`, r.atl != null && `ATL ${r.atl.toFixed(0)}`, r.tsb != null && `TSB ${r.tsb.toFixed(0)}`,
        r.hrv != null && `HRV ${r.hrv}`, r.restHr != null && `FC repos ${r.restHr}`, r.sleepScore != null && `sommeil ${r.sleepScore}`].filter(Boolean).join(" · ")).join("\n");
  } catch {
    return "";
  }
}

type Race = Record<string, unknown> & { id: string; name: string; date: string; status?: string; distanceKm?: number; dplus?: number; place?: string; result?: { s?: number; place?: string; strava?: string } };

/** Contexte complet envoyé au coach avant la conversation. */
export async function coachContext(raceId?: string | null) {
  const { races, me } = (await readStore()) as { races: Race[]; me: Record<string, unknown> | null };
  const notes = (await kvGet<string>("coach_notes")) ?? DEFAULT_NOTES;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const upcoming = races.filter((r) => r.status !== "done" && r.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = races.filter((r) => !upcoming.includes(r)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const focus = races.find((r) => r.id === raceId) ?? upcoming[0];

  const strip = (r: Race) => {
    const { checks: _c, weather: w, ...rest } = r as Race & { checks?: unknown; weather?: Record<string, unknown> };
    return { ...rest, weather: w ? { ...w, locationKey: undefined } : undefined };
  };
  const pastLines = past.map((r) => {
    const s = r.result?.s;
    return `${r.date} · ${r.name} · ${r.distanceKm ?? "?"} km, D+ ${r.dplus ?? 0} m` + (s ? ` · ${hms(s)} (${pace(s, r.distanceKm ?? 0)}/km)` : "") +
      (r.result?.place ? ` · ${r.result.place}` : "") + (r.result?.strava ? ` · son ressenti : « ${r.result.strava.replace(/\s+/g, " ")} »` : "");
  });

  let strava = "";
  try {
    strava = await stravaHistory();
  } catch (e) {
    strava = e instanceof NotConnected ? "(Strava non connecté : pas d'historique disponible.)" : "(Historique Strava momentanément indisponible.)";
  }
  const garmin = await garminMetrics();

  return [
    `Tu es le coach de course à pied personnel de Killian, dans son app Kida. Nous sommes le ${parisDate()} (${today}).`,
    `Règles : réponds en français, en tutoyant, court (8 lignes max sauf si on te demande une analyse détaillée), concret, avec des allures et des FC quand c'est utile. Appuie-toi sur les données ci-dessous et cite-les. N'invente aucun chiffre absent. Si une info manque, dis-le ou pose une question. Pas de diagnostic médical : douleur, fièvre ou symptôme inhabituel → avis médical.`,
    `\n=== PROFIL ET NOTES DE KILLIAN ===\n${notes}`,
    focus ? `\n=== COURSE EN FOCUS : ${focus.name} (${focus.date}) — fiche complète (JSON) ===\n${JSON.stringify(strip(focus))}` : "",
    upcoming.filter((r) => r !== focus).length ? `\n=== AUTRES COURSES À VENIR ===\n${upcoming.filter((r) => r !== focus).map((r) => `${r.date} · ${r.name} · ${r.distanceKm ?? "?"} km`).join("\n")}` : "",
    pastLines.length ? `\n=== COURSES PASSÉES ===\n${pastLines.join("\n")}` : "",
    me ? `\n=== FORME, RECORDS ET PRÉDICTIONS (JSON, relevés Garmin / intervals.icu) ===\n${JSON.stringify(me)}` : "",
    `\n=== HISTORIQUE STRAVA ===\n${strava}`,
    garmin ? `\n=== ${garmin}` : "",
  ].filter(Boolean).join("\n").slice(0, 120000);
}
