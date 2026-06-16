import { PrismaClient } from "@prisma/client";
import { activitiesToFitness, dailyLoadMap } from "./aggregate";

const prisma = new PrismaClient();

export { activitiesToFitness };

/**
 * I/O : recalcule et upsert toutes les DailyMetric de l'athlète.
 * À lancer après chaque ingestion (et/ou via un cron quotidien).
 */
export async function recomputeDailyMetrics(athleteId = "me"): Promise<number> {
  const activities = await prisma.activity.findMany({
    where: { athleteId },
    select: { startedAt: true, trainingLoad: true },
    orderBy: { startedAt: "asc" },
  });

  const series = activitiesToFitness(activities);
  const dayLoads = dailyLoadMap(activities);

  for (const p of series) {
    await prisma.dailyMetric.upsert({
      where: { athleteId_date: { athleteId, date: new Date(p.date) } },
      update: { dayLoad: dayLoads.get(p.date) ?? 0, ctl: p.ctl, atl: p.atl, tsb: p.tsb },
      create: {
        athleteId,
        date: new Date(p.date),
        dayLoad: dayLoads.get(p.date) ?? 0,
        ctl: p.ctl,
        atl: p.atl,
        tsb: p.tsb,
      },
    });
  }
  return series.length;
}
