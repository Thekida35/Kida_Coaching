import { PrismaClient } from "@prisma/client";
import { ScoreInputs } from "./score";

const prisma = new PrismaClient();
const DAY = 86400000;

/** Assemble les signaux du score à partir des données stockées. */
export async function buildScoreInputs(athleteId = "me"): Promise<ScoreInputs> {
  const me = await prisma.athleteProfile.findUniqueOrThrow({ where: { id: athleteId } });
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since28 = new Date(now - 28 * DAY);
  const since84 = new Date(now - 84 * DAY);

  const latest = await prisma.dailyMetric.findFirst({
    where: { athleteId },
    orderBy: { date: "desc" },
  });

  const acts30 = await prisma.activity.findMany({
    where: { athleteId, startedAt: { gte: since30 } },
    select: {
      sport: true,
      distanceM: true,
      avgSpeedMs: true,
      decoupling: true,
      hrZoneSecs: true,
      paceZoneSecs: true,
    },
  });

  // Z3+Z4 et Z5 (HR en priorité, sinon allure)
  let z34 = 0;
  let z5 = 0;
  for (const a of acts30) {
    const z = a.hrZoneSecs?.length ? a.hrZoneSecs : a.paceZoneSecs;
    if (!z?.length) continue;
    z34 += (z[2] ?? 0) + (z[3] ?? 0);
    z5 += z[4] ?? 0;
  }

  const runs30 = acts30.filter((a) => ["RUN", "TRAIL", "ULTRA"].includes(a.sport));
  const longestRunKm30d = Math.max(0, ...runs30.map((a) => (a.distanceM ?? 0) / 1000));
  const decs = acts30.map((a) => a.decoupling).filter((d): d is number => d != null);
  const avgDecoupling30d = decs.length ? decs.reduce((x, y) => x + y, 0) / decs.length : null;

  const paces = runs30
    .filter((a) => (a.distanceM ?? 0) >= 3000 && a.avgSpeedMs)
    .map((a) => 1000 / (a.avgSpeedMs as number));
  const bestPaceSecPerKm30d = paces.length ? Math.min(...paces) : null;

  // Fréquence sur 28 j
  const acts28 = await prisma.activity.findMany({
    where: { athleteId, startedAt: { gte: since28 } },
    select: { startedAt: true },
  });
  const days = new Set(acts28.map((a) => a.startedAt.toISOString().slice(0, 10)));
  const activeDays28 = days.size;

  // Coefficient de variation du volume hebdomadaire (84 j)
  const acts84 = await prisma.activity.findMany({
    where: { athleteId, startedAt: { gte: since84 } },
    select: { startedAt: true, distanceM: true },
  });
  const weeklyVolumeCv = cvWeekly(acts84);

  // Lignes de base HRV / FC repos (moyennes disponibles)
  const metrics60 = await prisma.dailyMetric.findMany({
    where: { athleteId, date: { gte: new Date(now - 60 * DAY) } },
    select: { hrv: true, restHr: true },
  });
  const hrvBaseline = mean(metrics60.map((m) => m.hrv));
  const restHrBaseline = mean(metrics60.map((m) => m.restHr));

  return {
    ctl: latest?.ctl ?? 0,
    tsb: latest?.tsb ?? 0,
    longestRunKm30d,
    avgDecoupling30d,
    thresholdMin30d: z34 / 60,
    z5Min30d: z5 / 60,
    bestPaceSecPerKm30d,
    thresholdPaceSecPerKm: me.thresholdPaceSecPerKm ?? 240,
    hrv: latest?.hrv ?? null,
    hrvBaseline,
    restHr: latest?.restHr ?? me.restHr ?? null,
    restHrBaseline: restHrBaseline ?? me.restHr ?? null,
    activeDays28,
    weeklyVolumeCv,
  };
}

function cvWeekly(acts: { startedAt: Date; distanceM: number | null }[]): number | null {
  const byWeek = new Map<string, number>();
  for (const a of acts) {
    const k = isoWeekKey(a.startedAt);
    byWeek.set(k, (byWeek.get(k) ?? 0) + (a.distanceM ?? 0) / 1000);
  }
  const vals = [...byWeek.values()];
  if (vals.length < 3) return null;
  const m = vals.reduce((x, y) => x + y, 0) / vals.length;
  if (m === 0) return null;
  const variance = vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
  return Math.sqrt(variance) / m;
}

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mean(arr: (number | null)[]): number | null {
  const v = arr.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
