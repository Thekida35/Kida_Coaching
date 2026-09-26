import { aiClient, AI_MODEL } from "@/lib/ai";
import { kvGet, kvSet } from "@/lib/hub/db";
import { coachContext } from "@/lib/hub/coachContext";
import { loadChat, saveChat } from "@/lib/hub/chat";
import { sendAll } from "@/lib/hub/push";
import { api, stravaConfigured } from "@/lib/hub/strava";

/**
 * Coach proactif : à chaque passage du cron, repère la dernière course à pied arrivée sur Strava,
 * la fait analyser par le coach, range l'analyse dans la conversation et envoie une notification.
 */
const KEY = "analysed"; // { lastId } : id Strava de la dernière sortie traitée (les id sont croissants)
const MAX_AGE = 36 * 3600e3; // une sortie plus ancienne n'est plus « fraîche » : on ne la commente pas

type Summary = { id: number; name: string; sport_type: string; start_date: string };
type Split = { distance: number; moving_time: number; elevation_difference?: number; average_heartrate?: number; split: number };
type Lap = { name?: string; distance: number; moving_time: number; average_heartrate?: number; max_heartrate?: number; average_cadence?: number };
type Detail = Summary & {
  start_date_local: string; description?: string | null; distance: number; moving_time: number; elapsed_time: number;
  total_elevation_gain?: number; average_heartrate?: number; max_heartrate?: number; average_cadence?: number; suffer_score?: number;
  start_latlng?: number[] | null; splits_metric?: Split[]; laps?: Lap[]; gear?: { name?: string; distance?: number } | null; device_name?: string;
};

const hms = (s: number) => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`;
};
const pace = (s: number, m: number) => (m > 0 ? hms((s / m) * 1000) : "—");
const hr = (v?: number) => (v ? `${Math.round(v)}` : "—");

/** Météo au départ de la sortie (Open-Meteo, heure par heure). */
async function weatherAt(a: Detail): Promise<string> {
  const [lat, lon] = a.start_latlng ?? [];
  if (lat == null || lon == null) return "inconnue (pas de GPS)";
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("hourly", "temperature_2m,dew_point_2m,relative_humidity_2m,wind_speed_10m");
  u.searchParams.set("timezone", "Europe/Paris");
  u.searchParams.set("past_days", "2");
  u.searchParams.set("forecast_days", "1");
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) return "indisponible";
  const h = (await r.json()).hourly;
  const i = (h.time as string[]).indexOf(a.start_date_local.slice(0, 13) + ":00");
  if (i < 0) return "indisponible";
  return `${Math.round(h.temperature_2m[i])} °C, point de rosée ${Math.round(h.dew_point_2m[i])} °C, humidité ${h.relative_humidity_2m[i]} %, vent ${Math.round(h.wind_speed_10m[i])} km/h`;
}

/** Fiche texte de la sortie, avec tours et kilomètres, pour le modèle. */
export function describe(a: Detail, weather: string) {
  const L = [
    `Sortie : « ${a.name} » — ${a.start_date_local.replace("T", " ").slice(0, 16)} (${a.sport_type})`,
    `Distance ${(a.distance / 1000).toFixed(2)} km · temps ${hms(a.moving_time)} (écoulé ${hms(a.elapsed_time)}) · allure ${pace(a.moving_time, a.distance)}/km`,
    `FC moy ${hr(a.average_heartrate)} / max ${hr(a.max_heartrate)} · D+ ${Math.round(a.total_elevation_gain ?? 0)} m` +
      (a.average_cadence ? ` · cadence ${Math.round(a.average_cadence * 2)} pas/min` : "") + (a.suffer_score ? ` · effort relatif ${a.suffer_score}` : ""),
    `Météo au départ : ${weather}`,
  ];
  if (a.gear?.name) L.push(`Chaussures : ${a.gear.name}${a.gear.distance ? ` (${Math.round(a.gear.distance / 1000)} km au total)` : ""}`);
  if (a.description?.trim()) L.push(`Son ressenti (description Strava) : « ${a.description.trim()} »`);
  if (a.laps && a.laps.length > 1)
    L.push("", "Tours :", ...a.laps.map((l, i) => `${i + 1}. ${(l.distance / 1000).toFixed(2)} km en ${hms(l.moving_time)} · ${pace(l.moving_time, l.distance)}/km · FC ${hr(l.average_heartrate)}/${hr(l.max_heartrate)}`));
  if (a.splits_metric?.length)
    L.push("", "Kilomètres :", ...a.splits_metric.map((s) => `km ${s.split} : ${pace(s.moving_time, s.distance)}/km · FC ${hr(s.average_heartrate)} · dénivelé ${Math.round(s.elevation_difference ?? 0)} m`));
  return L.join("\n");
}

const ASK = `Analyse automatique de la sortie qui vient d'arriver sur Strava (Killian ne l'a pas encore demandée).
Format : une première ligne « **Verdict :** … » en une phrase, puis ### Ce qui s'est passé (tours ou km clés, FC, météo si elle a pesé), ### Par rapport au plan (compare avec la séance prévue ce jour-là s'il y en a une), ### Pour la suite (1 à 3 consignes concrètes pour les prochains jours).
Reste court : 150 à 250 mots. Si un signal d'alerte apparaît (dérive cardiaque anormale, douleur citée dans le ressenti), dis-le clairement.`;

/** Première ligne lisible du verdict, pour le texte de la notification. */
export function verdictLine(md: string) {
  const line = md.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
  const t = line.replace(/\*\*|__|[*_`>#]/g, "").replace(/^verdict\s*:\s*/i, "").trim();
  return t.length > 140 ? t.slice(0, 137) + "…" : t;
}

export async function analyseNewRun(now = Date.now()) {
  if (!stravaConfigured() || !process.env.GEMINI_API_KEY) return "non configuré";
  const state = await kvGet<{ lastId: number }>(KEY);
  const recent = ((await api("/athlete/activities?per_page=10")) as Summary[]).filter((a) => /Run/.test(a.sport_type));
  const newest = Math.max(0, ...recent.map((a) => a.id));
  // Premier passage : on prend la dernière sortie comme point de départ, sans la commenter.
  if (!state) {
    await kvSet(KEY, { lastId: newest });
    return "point de départ";
  }
  const todo = recent.filter((a) => a.id > state.lastId && now - Date.parse(a.start_date) < MAX_AGE).sort((a, b) => b.id - a.id)[0];
  if (!todo) {
    if (newest > state.lastId) await kvSet(KEY, { lastId: newest });
    return "rien de nouveau";
  }
  // Marquée avant l'appel au modèle : en cas d'échec, pas de nouvelle tentative à chaque passage.
  await kvSet(KEY, { lastId: Math.max(newest, todo.id) });

  const a = (await api(`/activities/${todo.id}`)) as Detail;
  const [weather, ctx] = await Promise.all([weatherAt(a).catch(() => "indisponible"), coachContext()]);
  const res = await aiClient().chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "system", content: ctx }, { role: "user", content: `${ASK}\n\n${describe(a, weather)}` }],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) return "réponse vide";

  const chat = await loadChat();
  const t = Date.now();
  await saveChat([...chat, { role: "user", content: `📊 Analyse automatique de ma sortie « ${a.name} »`, t }, { role: "assistant", content: text, t: t + 1 }]);
  await sendAll({ title: `📊 Analyse prête · ${a.name}`, body: verdictLine(text) || "Ton coach a analysé ta sortie.", url: "/?v=coach" }, "analyse");
  return `analysée : ${a.name}`;
}
