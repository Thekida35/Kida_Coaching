/**
 * Données d'exemple 100 % fictives pour les captures du README (npm run screenshots).
 * Aucune donnée réelle : coureur « Alex », courses inventées, dates calculées à partir d'aujourd'hui.
 */
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const short = (n: number) => new Date(Date.now() + n * 864e5).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");

const planRows: [string, string, string, string][] = [
  ["Footing 45′ zone 2", "FC sous 148 · cadence 180", "Du volume facile pour assimiler la semaine.", "⛅ 17°"],
  ["Spécifique 4 × 1500 m", "@ 3:55/km · r 2′ · le matin", "La séance clé de la semaine : allure de course, pas plus vite.", "☀️ 19°"],
  ["Repos", "Étirements doux, sommeil", "La séance d'hier s'assimile aujourd'hui.", "⛅ 18°"],
  ["Footing 40′ + 4 lignes droites", "Facile · 4 × 80 m progressives", "Réveiller les jambes sans fatigue.", "🌧 16°"],
  ["Sortie longue 1 h 15", "Dont 2 × 10′ @ 4:05", "Dernière sortie longue avant l'affûtage.", "⛅ 17°"],
  ["Repos", "Hydratation", "On coupe le volume, jamais l'intensité.", "☀️ 20°"],
  ["Rappel 5 × 1′ @ 3:50", "r 1′30 · 20′ d'échauffement", "Toucher l'allure, rien de plus.", "⛅ 18°"],
  ["Repos", "Coucher tôt", "La nuit qui compte, c'est celle-ci.", "☀️ 19°"],
  ["20′ + 3 × 80 m", "Le matin · retrait du dossard", "Dîner tôt, glucides, peu de fibres.", "⛅ 18°"],
];

export const demoRaces = [
  {
    id: "foulees-du-port",
    name: "Foulées du Port",
    date: iso(9),
    time: "10:00",
    place: "Port-Joli",
    distanceKm: 10,
    dplus: 35,
    priority: "A",
    status: "upcoming",
    goalSel: "B",
    goals: [{ k: "A", s: 2340 }, { k: "B", s: 2370 }, { k: "C", s: 2400 }],
    prediction: { s: 2365, src: "Garmin" },
    weather: { temp: "18° max", wind: "12 km/h ouest", sky: "éclaircies", note: "Prévision à neuf jours : elle va bouger. Conditions idéales sous 15 °C." },
    racePlan: [
      { km: "Km 1", seg: "start", tag: "FC ≤ 170", text: "Laisse partir la meute, trouve ta place. Jamais sous 3:50." },
      { km: "Km 2–5", seg: "mid", tag: "allure cible", text: "Régulier. Accroche un groupe à ton allure." },
      { km: "Km 6–8", seg: "mid", tag: "FC 176–178", text: "Le moment dur : ne regarde que le kilomètre en cours." },
      { km: "Km 9–10", seg: "end", tag: "si FC < 180", text: "Tu vides. Dernier kilomètre à l'envie." },
    ],
    racePlanNote: "FC cible 174 à 178. Le vent sur la digue au km 6 : abrite-toi derrière un groupe.",
    course: { start: "Quai des Pêcheurs", finish: "Place du Phare", exactKm: 10.0, sas: "SAS 2", warn: ["Dossard la veille au village."] },
    plan: planRows.map(([title, detail, why, chip], i) => ({ date: iso(i), title, detail, why, chip })).concat([
      { date: iso(9), title: "Foulées du Port", detail: "10 km · 10h00 · SAS 2", why: "Pars à 3:57-3:58, ne passe pas sous 3:50 au premier kilomètre.", chip: "⛅ 18°" },
    ]),
    planNote: "Dernière semaine chargée, puis affûtage : le volume baisse, l'intensité reste.",
    planRule: ["Règle du matin de séance.", "FC repos normale et bien dormi : séance complète. Sinon : moitié de séance."],
    sessions: [
      { t: "Spécifique 10 km", d: "4 × 1500 m @ 3:55 · r 2′", w: "L'allure de course, en conditions de course." },
      { t: "Footing zone 2", d: "40–60′ · FC sous 148", w: "Vraiment facile." },
    ],
    gear: [
      { n: "Chaussures carbone", u: "120 km · séance clé + jour J", tone: "g" },
      { n: "Chaussures d'entraînement", u: "footings faciles" },
    ],
    day: [
      { h: "07:00", w: "Lever", small: "Un grand verre d'eau." },
      { h: "07:30", w: "Petit-déjeuner", small: "Déjà testé à l'entraînement" },
      { h: "09:15", w: "Échauffement 20′", small: "12′ footing · gammes · 3 × 80 m" },
      { h: "09:45", w: "Dans le SAS" },
      { h: "10:00", w: "Départ", key: true },
    ],
    bag: ["Dossard + 4 épingles", "Chaussures carbone", "Montre chargée", "Tenue sèche pour après"],
    checks: {},
  },
  {
    id: "trail-des-falaises",
    name: "Trail des Falaises",
    date: iso(48),
    time: "08:30",
    place: "Cap-Vert",
    distanceKm: 32,
    dplus: 1100,
    priority: "B",
    status: "upcoming",
    checks: {},
  },
  {
    id: "semi-du-canal",
    name: "Semi du Canal",
    date: iso(-24),
    time: "09:30",
    place: "Val-Canal",
    distanceKm: 21.1,
    dplus: 40,
    status: "done",
    result: { s: 5235, place: "142e / 1 830", strava: "Bonnes sensations jusqu'au 18e, un peu dur à la fin avec le vent." },
    checks: {},
  },
];

export const demoMe = {
  firstName: "Alex",
  records: [
    { k: "5 km", s: 1128, km: 5, when: "mai" },
    { k: "10 km", s: 2395, km: 10, when: "juin" },
    { k: "Semi-marathon", s: 5235, km: 21.0975, when: short(-24) },
    { k: "Marathon", s: null },
  ],
  forme: {
    asOf: iso(-1),
    condition: 24,
    conditionNote: "en hausse",
    fatigue: 31,
    fatigueNote: "stable",
    tsb: "−7",
    tsbNote: "remonte avec l'affûtage",
    easyLabel: "FC à 5:00/km",
    easyHr: "146",
    easyNote: "−3 vs il y a 15 jours",
    alert: "Ta FC à allure facile baisse depuis deux semaines : l'endurance progresse. Garde les footings vraiment faciles.",
    threshold: [{ d: "1/09", s: 245 }, { d: "5/09", s: 242 }, { d: "10/09", s: 240 }, { d: "15/09", s: 238 }, { d: "20/09", s: 236 }, { d: "24/09", s: 235 }],
    thresholdNote: "Allure seuil : de 4:05 à 3:55 en trois semaines.",
    predSrc: "Garmin",
    predictions: [{ k: "5 km", s: 1120, km: 5 }, { k: "10 km", s: 2365, km: 10 }, { k: "Semi", s: 5210, km: 21.0975 }, { k: "Marathon", s: 11050, km: 42.195 }],
    signals: [
      { l: "VO2max", v: "57", u: "excellent" },
      { l: "Charge aiguë", v: "640", u: "optimale" },
      { l: "HRV / FC nuit", v: "68", u: "/ 50" },
      { l: "FC repos", v: "48", u: "feu vert" },
      { l: "Volume 30 jours", v: "185", u: "km · 20 sorties" },
    ],
    last7: [
      { d: short(-1), n: "Footing", p: "5:02", hr: 146, e: 42 },
      { d: short(-2), n: "4 × 1500 m", p: "4:21", hr: 163, e: 96 },
      { d: short(-4), n: "Sortie longue", p: "4:48", hr: 152, e: 118 },
      { d: short(-5), n: "Récup", p: "5:40", hr: 130, e: 15 },
      { d: short(-6), n: "Fartlek", p: "4:35", hr: 158, e: 74 },
    ],
  },
};

export const demoChat = [
  { role: "user", content: "📊 Analyse automatique de ma sortie « 4 × 1500 m »", t: Date.now() - 20 * 3600e3 },
  {
    role: "assistant",
    t: Date.now() - 20 * 3600e3,
    content:
      "**Verdict :** séance réussie, allure tenue sans forcer, FC sous contrôle.\n\n### Ce qui s'est passé\n| Fraction | Allure | FC moy |\n|---|---|---|\n| 1 | 3:56 | 171 |\n| 2 | 3:55 | 174 |\n| 3 | 3:54 | 176 |\n| 4 | 3:53 | 177 |\n\nProgression régulière, et 17 °C au départ : conditions idéales.\n\n### Pour la suite\n- Demain : **repos**, c'est là que la séance s'assimile.\n- Footing de jeudi : reste sous **148** de FC.",
  },
  { role: "user", content: "Je pars sur quelle allure le jour J ?", t: Date.now() - 3600e3 },
  {
    role: "assistant",
    t: Date.now() - 3600e3,
    content:
      "**3:57 à 3:58/km** pour viser **39:30**.\n\n- Km 1 : jamais sous 3:50, laisse partir la meute.\n- Km 6 : vent de face sur la digue, abrite-toi dans un groupe.\n- Km 9–10 : si la FC est sous 180, tu vides.",
  },
];

export const demoInbox = [
  { id: "d1", t: Date.now() - 20 * 3600e3, kind: "analyse", title: "📊 Analyse prête · 4 × 1500 m", body: "Séance réussie, allure tenue sans forcer, FC sous contrôle." },
  { id: "d2", t: Date.now() - 26 * 3600e3, kind: "veille", title: "⚡ Demain : 4 × 1500 m", body: "@ 3:55/km, le matin. Dîner glucides, coucher tôt." },
  { id: "d3", t: Date.now() - 50 * 3600e3, kind: "brief", title: "☀️ J−11 · Footing 45′", body: "Zone 2, FC sous 148. 17° et éclaircies." },
];

/** Prévisions météo au format de /api/weather. */
export function demoWeather() {
  const codes = [2, 1, 0, 3, 61, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3];
  return {
    source: "Open-Meteo",
    dailyForecast: codes.map((code, i) => ({
      date: `${iso(i)}T07:00:00`,
      day: {
        temperature: 16 + (i % 4), displayTemperature: `${16 + (i % 4)}°`, realFeel: `${15 + (i % 4)}°`, code,
        iconPhrase: code === 0 ? "Ciel dégagé" : code === 61 ? "Pluie faible" : "Partiellement nuageux",
        precip: `${code === 61 ? 70 : 10} %`, extended: { wind: "O 12 km/h", gusts: "25 km/h" },
      },
    })),
  };
}

export const demoActivities = [
  { id: "1", name: "Footing", description: "", sport_type: "Run", start_local: `${iso(-1)}T07:10:00`, activity_tags: [], summary: { distance: 9000, moving_time: 2718, elapsed_time: 2760, relative_effort: 42, avg_hr: 146, max_hr: 158, elev: 30 } },
  { id: "2", name: "4 × 1500 m", description: "Bonnes jambes", sport_type: "Run", start_local: `${iso(-2)}T07:30:00`, activity_tags: [], summary: { distance: 12000, moving_time: 3132, elapsed_time: 3400, relative_effort: 96, avg_hr: 163, max_hr: 179, elev: 25 } },
];

export const demoGear = [
  { gear_id: { id: "g1", gear_type: "Shoe" }, brand: "Marque", model_name: "Chaussures carbone", retired: false, total_distance: 120000 },
  { gear_id: { id: "g2", gear_type: "Shoe" }, brand: "Marque", model_name: "Chaussures d'entraînement", retired: false, total_distance: 610000 },
];
