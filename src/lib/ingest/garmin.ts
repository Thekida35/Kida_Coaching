import { NormalizedActivity, mapSport } from "./normalize";

/**
 * Parse l'export Garmin `summarizedActivities.json` (clé summarizedActivitiesExport).
 * Unités Garmin : distance en cm (÷100000 = km → ×1000 = m), durées en ms,
 * avgSpeed ×10 = m/s, hrTimeInZone en ms, timestamps en ms epoch.
 * Garmin fournit déjà la charge et le temps par zone FC : on les réutilise tels quels.
 */
export function parseGarminSummaries(jsonText: string): NormalizedActivity[] {
  const data = JSON.parse(jsonText);
  const root = Array.isArray(data) ? data[0] : data;
  const list: any[] = root?.summarizedActivitiesExport ?? root?.summarizedActivities ?? [];

  return list
    .map(mapGarminActivity)
    .filter((a): a is NormalizedActivity => a !== null);
}

function mapGarminActivity(a: any): NormalizedActivity | null {
  if (!a?.activityId || !a?.beginTimestamp) return null;

  const distanceM = a.distance != null ? a.distance / 100 : null; // cm → m
  const movingTimeS = a.movingDuration != null ? Math.round(a.movingDuration / 1000) : null;
  const elapsedTimeS = a.duration != null ? Math.round(a.duration / 1000) : null;
  const avgSpeedMs = a.avgSpeed != null ? a.avgSpeed * 10 : null;
  const maxSpeedMs = a.maxSpeed != null ? a.maxSpeed * 10 : null;

  // Garmin : 7 paliers FC (0..6). On agrège vers nos 5 zones :
  // Z1=z0+z1, Z2=z2, Z3=z3, Z4=z4, Z5=z5+z6 (en secondes).
  const z = (i: number) => Math.round((a[`hrTimeInZone_${i}`] ?? 0) / 1000);
  const hrZoneSecs = [z(0) + z(1), z(2), z(3), z(4), z(5) + z(6)];
  const hasZones = hrZoneSecs.some((s) => s > 0);

  const sportRaw = String(a.activityType ?? a.sportType ?? "running");

  return {
    source: "GARMIN",
    externalId: String(a.activityId),
    sport: mapSport(sportRaw),
    name: a.name ?? a.locationName ?? null,
    startedAt: new Date(a.beginTimestamp),
    distanceM,
    movingTimeS,
    elapsedTimeS,
    elevationGainM: a.elevationGain ?? null,
    avgSpeedMs,
    maxSpeedMs,
    avgHr: a.avgHr != null ? Math.round(a.avgHr) : null,
    maxHr: a.maxHr != null ? Math.round(a.maxHr) : null,
    avgCadence: a.avgRunCadence ?? a.avgDoubleCadence ?? null,
    avgPowerW: a.avgPower ?? null,
    calories: a.calories != null ? Math.round(a.calories) : null,
    // Garmin donne déjà la charge → on la passe comme relativeEffort (utilisée telle quelle)
    relativeEffort: a.activityTrainingLoad != null ? Math.round(a.activityTrainingLoad) : null,
    hrZoneSecs: hasZones ? hrZoneSecs : undefined,
    raw: undefined,
  };
}
