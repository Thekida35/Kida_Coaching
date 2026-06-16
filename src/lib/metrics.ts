/**
 * Moteur de métriques de Tempo.
 *
 * Règle d'or : ces chiffres sont calculés ICI, jamais par le LLM.
 * Tout est testé (voir metrics.test.ts) et validable contre Strava/Garmin.
 */

// ── Charge d'entraînement par activité ───────────────────────────────────

export interface LoadInputs {
  relativeEffort?: number | null; // "Suffer Score" Strava (déjà FC-pondéré)
  durationS?: number | null;
  avgHr?: number | null;
  // Repères athlète (pour le fallback TRIMP)
  restHr?: number | null;
  maxHr?: number | null;
}

/**
 * Charge du jour pour une activité.
 * 1) Si Strava fournit relative_effort → on l'utilise (le plus fiable, FC-based).
 * 2) Sinon TRIMP de Banister (formule homme) à partir de FC moyenne + durée.
 * 3) Sinon null (on ne devine pas).
 */
export function activityLoad(i: LoadInputs): number | null {
  if (i.relativeEffort != null && i.relativeEffort > 0) {
    return round1(i.relativeEffort);
  }
  if (i.durationS && i.avgHr && i.restHr != null && i.maxHr != null) {
    const hrr = (i.avgHr - i.restHr) / (i.maxHr - i.restHr);
    const hrrClamped = clamp(hrr, 0, 1);
    const minutes = i.durationS / 60;
    // TRIMP exponentiel (coef homme 1.92)
    const trimp = minutes * hrrClamped * 0.64 * Math.exp(1.92 * hrrClamped);
    return round1(trimp);
  }
  return null;
}

// ── CTL / ATL / TSB (modèle EWMA type "Performance Manager") ─────────────

export interface DayLoad {
  date: string; // YYYY-MM-DD
  load: number; // 0 si jour de repos
}

export interface FitnessPoint {
  date: string;
  ctl: number; // forme chronique (constante 42 j)
  atl: number; // fatigue aiguë (constante 7 j)
  tsb: number; // fraîcheur = ctl(veille) - atl(veille)
}

const CTL_TAU = 42;
const ATL_TAU = 7;

/**
 * Série chronologique de forme/fatigue/fraîcheur.
 * `days` doit être trié par date croissante et SANS trous (un point par jour,
 * load=0 les jours sans séance). Utilise fillDailyLoads() pour ça.
 */
export function fitnessSeries(
  days: DayLoad[],
  seed = { ctl: 0, atl: 0 }
): FitnessPoint[] {
  const out: FitnessPoint[] = [];
  let ctlPrev = seed.ctl;
  let atlPrev = seed.atl;
  const kC = 1 / CTL_TAU;
  const kA = 1 / ATL_TAU;

  for (const d of days) {
    // TSB se lit sur les valeurs de la VEILLE (convention PMC)
    const tsb = ctlPrev - atlPrev;
    const ctl = ctlPrev + (d.load - ctlPrev) * kC;
    const atl = atlPrev + (d.load - atlPrev) * kA;
    out.push({ date: d.date, ctl: round1(ctl), atl: round1(atl), tsb: round1(tsb) });
    ctlPrev = ctl;
    atlPrev = atl;
  }
  return out;
}

/** Remplit les jours manquants avec load=0 entre la 1re et la dernière date. */
export function fillDailyLoads(sparse: DayLoad[]): DayLoad[] {
  if (sparse.length === 0) return [];
  const byDate = new Map(sparse.map((d) => [d.date, d.load]));
  const sorted = [...byDate.keys()].sort();
  const start = new Date(sorted[0] + "T00:00:00Z");
  const end = new Date(sorted[sorted.length - 1] + "T00:00:00Z");
  const out: DayLoad[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10);
    out.push({ date: key, load: byDate.get(key) ?? 0 });
  }
  return out;
}

// ── Classification en zones (avec TES bornes) ────────────────────────────

/** Zone FC 1..5 d'une valeur bpm, à partir des bornes hautes de Z1..Z4. */
export function hrZone(bpm: number, zonesHighBpm: number[]): number {
  for (let z = 0; z < zonesHighBpm.length; z++) {
    if (bpm <= zonesHighBpm[z]) return z + 1;
  }
  return zonesHighBpm.length + 1; // au-dessus = dernière zone
}

/** Zone d'allure 1..N d'une vitesse (m/s), bornes hautes en s/km (Z1..Zn). */
export function paceZone(speedMs: number, zonesHighSecKm: number[]): number {
  if (speedMs <= 0) return 1;
  const secPerKm = 1000 / speedMs; // plus c'est petit, plus c'est rapide
  const EPS = 1e-6; // robustesse aux arrondis flottants pile sur une borne
  // bornes triées du plus lent (gros s/km) au plus rapide (petit s/km)
  for (let z = 0; z < zonesHighSecKm.length; z++) {
    if (secPerKm >= zonesHighSecKm[z] - EPS) return z + 1;
  }
  return zonesHighSecKm.length + 1;
}

/** Temps passé par zone (s) à partir d'un stream {time[], value[]}. */
export function timeInZones(
  timeS: number[],
  values: number[],
  classify: (v: number) => number,
  zoneCount: number
): number[] {
  const secs = new Array(zoneCount).fill(0);
  for (let i = 1; i < timeS.length; i++) {
    const dt = timeS[i] - timeS[i - 1];
    if (dt <= 0) continue;
    const z = clamp(classify(values[i]), 1, zoneCount);
    secs[z - 1] += dt;
  }
  return secs;
}

// ── Découplage cardiaque (durabilité aérobie) ────────────────────────────

/**
 * Pa:HR decoupling — dérive entre 1re et 2e moitié de la sortie.
 * >5% = endurance aérobie à travailler ; ~0% = bonne durabilité.
 * Renvoie un pourcentage.
 */
export function decoupling(speedMs: number[], hr: number[]): number | null {
  const n = Math.min(speedMs.length, hr.length);
  if (n < 20) return null;
  const mid = Math.floor(n / 2);
  const ratio = (s: number[], h: number[]) => {
    const sa = avg(s);
    const ha = avg(h);
    return ha > 0 ? sa / ha : 0;
  };
  const first = ratio(speedMs.slice(0, mid), hr.slice(0, mid));
  const second = ratio(speedMs.slice(mid), hr.slice(mid));
  if (first === 0) return null;
  return round1(((first - second) / first) * 100);
}

// ── helpers ──────────────────────────────────────────────────────────────
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
