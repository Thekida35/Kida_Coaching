import {
  activityLoad,
  hrZone,
  paceZone,
  timeInZones,
  decoupling,
} from "../metrics";

/**
 * Forme pivot : qu'une activité vienne d'un fichier FIT ou du MCP Strava,
 * on la ramène à CE format avant de l'enrichir et de la stocker.
 */
export interface ActivityStreams {
  timeS: number[]; // secondes écoulées depuis le départ
  hr?: number[];
  speedMs?: number[];
  altitudeM?: number[];
  latlng?: [number, number][];
  cadence?: number[];
  powerW?: number[];
}

export interface NormalizedActivity {
  source: "FIT_IMPORT" | "STRAVA" | "GETFAST" | "GARMIN";
  externalId?: string | null;
  sport: "RUN" | "TRAIL" | "ULTRA" | "RIDE" | "TRIATHLON" | "OTHER";
  name?: string | null;
  startedAt: Date;
  distanceM?: number | null;
  movingTimeS?: number | null;
  elapsedTimeS?: number | null;
  elevationGainM?: number | null;
  avgSpeedMs?: number | null;
  maxSpeedMs?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  avgCadence?: number | null;
  avgPowerW?: number | null;
  calories?: number | null;
  relativeEffort?: number | null; // fourni par Strava uniquement
  streams?: ActivityStreams;
  raw?: unknown;
}

export interface AthleteRefs {
  restHr?: number | null;
  maxHr?: number | null;
  hrZonesBpm: number[];
  paceZonesSecKm: number[];
}

/** Mappe les sports source → notre enum. */
export function mapSport(raw: string): NormalizedActivity["sport"] {
  const s = raw.toLowerCase();
  if (s.includes("trail")) return "TRAIL";
  if (s.includes("run")) return "RUN";
  if (s.includes("ride") || s.includes("cycl") || s.includes("bike")) return "RIDE";
  return "OTHER";
}

/**
 * Mapper PUR (sans Prisma) : produit les champs de l'activité + métriques
 * calculées. Le LLM ne fait rien ici — tout est déterministe et testable.
 */
export function toActivityData(n: NormalizedActivity, a: AthleteRefs) {
  const durationS = n.movingTimeS ?? n.elapsedTimeS ?? null;

  const trainingLoad = activityLoad({
    relativeEffort: n.relativeEffort ?? null,
    durationS,
    avgHr: n.avgHr ?? null,
    restHr: a.restHr ?? null,
    maxHr: a.maxHr ?? null,
  });

  let hrZoneSecs: number[] = [];
  let paceZoneSecs: number[] = [];
  let decouplingPct: number | null = null;

  const st = n.streams;
  if (st?.timeS?.length) {
    if (st.hr?.length) {
      hrZoneSecs = timeInZones(st.timeS, st.hr, (v) => hrZone(v, a.hrZonesBpm), 5);
    }
    if (st.speedMs?.length) {
      const zoneCount = a.paceZonesSecKm.length + 1;
      paceZoneSecs = timeInZones(
        st.timeS,
        st.speedMs,
        (v) => paceZone(v, a.paceZonesSecKm),
        zoneCount
      );
    }
    if (st.speedMs?.length && st.hr?.length) {
      decouplingPct = decoupling(st.speedMs, st.hr);
    }
  }

  return {
    source: n.source,
    externalId: n.externalId ?? null,
    sport: n.sport,
    name: n.name ?? null,
    startedAt: n.startedAt,
    distanceM: n.distanceM ?? null,
    movingTimeS: n.movingTimeS ?? null,
    elapsedTimeS: n.elapsedTimeS ?? null,
    elevationGainM: n.elevationGainM ?? null,
    avgSpeedMs: n.avgSpeedMs ?? null,
    maxSpeedMs: n.maxSpeedMs ?? null,
    avgHr: n.avgHr ?? null,
    maxHr: n.maxHr ?? null,
    avgCadence: n.avgCadence ?? null,
    avgPowerW: n.avgPowerW ?? null,
    calories: n.calories ?? null,
    trainingLoad,
    decoupling: decouplingPct,
    hrZoneSecs,
    paceZoneSecs,
  };
}

/**
 * Heuristique anti-doublon inter-sources (un même run en FIT ET en Strava) :
 * même départ à ±10 min et durée à ±5 %.
 */
export function isLikelySame(
  a: { startedAt: Date; movingTimeS?: number | null },
  b: { startedAt: Date; movingTimeS?: number | null }
): boolean {
  const dt = Math.abs(a.startedAt.getTime() - b.startedAt.getTime());
  if (dt > 10 * 60 * 1000) return false;
  if (a.movingTimeS && b.movingTimeS) {
    const ratio = Math.abs(a.movingTimeS - b.movingTimeS) / Math.max(a.movingTimeS, b.movingTimeS);
    return ratio <= 0.05;
  }
  return true;
}
