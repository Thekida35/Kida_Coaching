import { readStore, kvGet, kvSet } from "@/lib/hub/db";
import { api, NotConnected } from "@/lib/hub/strava";

/** Profil de départ du coach : ce qu'on sait de Killian en dehors des chiffres. Modifiable depuis l'onglet Coach. */
export const DEFAULT_NOTES = `IDENTITÉ
Killian, militaire (régiment), habite Saint-Aubin-du-Cormier (35), ~30 min de Rennes. Poids < 65 kg. Coureur route + trail : Ultra Marin Arvor 56 km (27/06/2026, 5:03:24, 61e/2155, 37-39 °C), index UTMB 623. Marathon de l'Espace 3:05 (29/03/2026, 11e). Semi ~1h25. Records 10 km (39:23) et 5 km (18:42) faits en séance, pas en course : ils sous-estiment son niveau. TRC sera son premier vrai 10 km.
Montre Garmin Forerunner 970, Strava, intervals.icu.

OBJECTIF
Tout Rennes Court 10 km, dim. 4 octobre 2026, 12h00, SAS 1. Référence 37:00 (A 36:45 · B 37:00 · C 37:30). Ne jamais baisser l'objectif en douce : s'il s'en éloigne, dire de combien et ce qu'il faut pour le combler.
Stratégie : km 1-2 à 3:45-3:46 (pavés, ne pas suivre les autres), km 3-8 à 3:42 FC 176-180, km 9-10 tout ce qui reste. Risque n°1 : partir trop vite.

REPÈRES PHYSIO
Seuil lactique FC 179. FC max observée ~190. FC repos 39-46 (40 fin sept.), FC nuit 44-45, HRV nuit 75-78 (plage 66-86). VO2max Garmin 61. Zones FC : Z2 126-156, Z3 157-172, Z4 173-187.
Prédiction Garmin 10 km : 38:03 (31/08) → 37:11 (20/09, meilleur) → 37:14. 5 km 17:34, semi 1:23:22.
Bilan sanguin 03/08 normal (ferritine 153, Hb 15,2, TSH 1,54).
Mécanique : cadence footing cible 182 (acquise), seuil 187-195 ; oscillation verticale stable ~8,5 cm ; rapport vertical 7,1 % au seuil.

SÉANCES CLÉS DE LA PRÉPA
31/08 seuil 15′ 3:53 FC 176 (22-24 °C) · 02/09 seuil 18′ 3:44 FC 178,5 · 08/09 3×6′ 3:47 FC 168 (rafales 55 km/h) · 13/09 4×1500 3:36 FC 168 sur piste en Alphafly (meilleure séance) · 15/09 2×15′ 3:44 FC 174,8, 384 W, effort 120 · 19/09 long 17 km avec 2×8′ 3:44 FC 181, effort 159 (échauffement et retour trop rapides) · 22/09 5×1′ couru à 3:29 au lieu de 3:40, récups trop vives (avec un collègue).
Rhume 22-25/09 : nuit du 23 FC 62 / HRV 56 / temp. peau +1,4 ; revenu à la normale le 24-25 (FC repos 40, HRV 77). Congestion résiduelle = +5 bpm à allure égale.
Le 3×2000 en Alphafly a été annulé (rhume) ; test Alphafly remplacé par 30′ + 4×400 @3:42 le mardi 29/09.

SANTÉ — HISTORIQUE
- Été 2026 : douleur ischio/fesse DROITE après l'ultra ; le médecin puis le kiné penchent pour une composante NERVEUSE (hernie discale / sciatique), déclencheur n°1 = station assise mal positionnée et station statique prolongée (debout aussi : PMT, festival, gardes). Indolore en courant, douloureux assis. Extensions McKenzie (sphinx) efficaces, la suspension (escalade) décomprime. Kiné : vitesse OK si douleur ≤ 3/10.
- Blocage lombaire/bassin GAUCHE (mécanique) pendant la PMT mi-août.
- Tendon d'Achille GAUCHE irrité depuis le 24/08 (sprints + festival) : raideur au réveil qui part à l'échauffement, en amélioration. Suivre la raideur matinale. Les Nike Vomero 18 sont soupçonnées → écartées jusqu'au 4 oct. Excentriques / renfo lourd lent après la course si ça persiste.
- Lignes rouges (médecin sans attendre) : douleur sous le genou, fourmillements, pied qui accroche, faiblesse persistante, zone selle/urinaire ; douleur thoracique, palpitations si malade.
- Plus de sprints (décision du 31/08) : ignorer les séances anaérobie/sprint que Garmin propose. Lignes droites sous-maximales OK.

MATÉRIEL
Nike Alphafly 3 (~154 km) : course + une seule séance de test avant, pas plus. Adizero Evo SL EXO : séances de qualité. New Balance Hierro V9 : footings, trail, forêt. Nike Vomero 18 : écartées.

HABITUDES ET CONTEXTE
- Il dépasse presque toujours les consignes d'allure (3:44 au lieu de 3:50, 2:55 au lieu de 3:15…) et court ses footings trop vite (biais Z3). Rappeler la consigne précise ; footing = FC < 145.
- Quand il court avec des collègues, les récups et les footings partent trop vite → séances clés seul.
- Métier physique à charge invisible (gardes 24 h, PMT, WOD, footing régimentaire le lundi parfois, sports co) : non visible dans Garmin/Intervals, en tenir compte. Le footing régimentaire du lundi matin n'est plus systématique ; il peut courir le lundi soir.
- Alcool occasionnel (soirées) : impact visible sur FC nuit, HRV, respiration, temp. peau.
- Capteur de poignet faux les 3-5 premiers km par temps froid/brouillard (vasoconstriction) : ignorer ce début, ceinture cardio pour les séances clés et le jour J.
- Ne boit pas de café : caféine le jour J ~125 mg (2 mg/kg) via gels déjà testés à 11h00, zéro caféine les 3 jours avant. Rien pendant un 10 km. Un Mars en course passe bien. Protéines 1,6-2 g/kg/jour.
- Règle d'allègement convenue : alléger si 2 critères sur 5 → FC repos ≥ 47, HRV < 70 deux jours, < 6 h de sommeil deux nuits, douleur pendant la course, 3 qualités sur 7 jours. Sinon la séance prévue se fait.
- Intervals.icu : Forme (TSB) optimale −10 à −30 pour construire, +5 à +12 visée le 4 octobre ; « zone grise » −10 à +5.

COMMENT LUI RÉPONDRE
Il est friand d'infos et de comparaisons. Structure : VERDICT en 2 lignes d'abord, puis le détail (conditions, chaussures, chiffres clés, comparaisons avec une séance de référence, ce qui pèse, LA SUITE avec une action concrète).
Pour chaque séance : date du jour et des précédentes, météo réelle (température, vent, humidité, point de rosée : ≥ 15 °C = air lourd), dénivelé/terrain, chaussures. Le vent et la chaleur expliquent souvent une séance « ratée » : ne pas conclure à une baisse de forme.
Tutoiement, français, direct. Ne pas radoter : dire une chose une fois. Pas de diagnostic médical.`;

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

  return [
    `Tu es le coach de course à pied personnel de Killian, dans son app Kida. Nous sommes le ${parisDate()} (${today}).`,
    `Règles : réponds en français, en tutoyant, concret, avec des allures et des FC quand c'est utile. Longueur proportionnée : quelques lignes pour une question simple ; pour une analyse de séance, VERDICT en tête puis le détail. Tu peux utiliser du Markdown (### titres, **gras**, listes, tableaux) quand ça aide la lecture. Appuie-toi sur les données ci-dessous et cite-les. N'invente aucun chiffre absent. Si une info manque, dis-le ou pose une question. Pas de diagnostic médical : douleur, fièvre ou symptôme inhabituel → avis médical.`,
    `\n=== PROFIL ET NOTES DE KILLIAN ===\n${notes}`,
    focus ? `\n=== COURSE EN FOCUS : ${focus.name} (${focus.date}) — fiche complète (JSON) ===\n${JSON.stringify(strip(focus))}` : "",
    upcoming.filter((r) => r !== focus).length ? `\n=== AUTRES COURSES À VENIR ===\n${upcoming.filter((r) => r !== focus).map((r) => `${r.date} · ${r.name} · ${r.distanceKm ?? "?"} km`).join("\n")}` : "",
    pastLines.length ? `\n=== COURSES PASSÉES ===\n${pastLines.join("\n")}` : "",
    me ? `\n=== FORME, RECORDS ET PRÉDICTIONS (JSON, relevés Garmin / intervals.icu) ===\n${JSON.stringify(me)}` : "",
    `\n=== HISTORIQUE STRAVA ===\n${strava}`,
  ].filter(Boolean).join("\n").slice(0, 120000);
}
