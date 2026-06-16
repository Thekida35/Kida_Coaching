import { DayLoad, fillDailyLoads, fitnessSeries, FitnessPoint } from "../metrics";

/**
 * PURE (sans base) : agrège des activités par jour puis calcule CTL/ATL/TSB.
 * Isolé ici pour rester testable sans Prisma.
 */
export function activitiesToFitness(
  activities: { startedAt: Date; trainingLoad: number | null }[]
): FitnessPoint[] {
  const byDay = dailyLoadMap(activities);
  const sparse: DayLoad[] = [...byDay.entries()].map(([date, load]) => ({ date, load }));
  return fitnessSeries(fillDailyLoads(sparse));
}

/** Somme de charge par jour (YYYY-MM-DD). */
export function dailyLoadMap(
  activities: { startedAt: Date; trainingLoad: number | null }[]
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const a of activities) {
    if (a.trainingLoad == null) continue;
    const key = a.startedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + a.trainingLoad);
  }
  return byDay;
}
