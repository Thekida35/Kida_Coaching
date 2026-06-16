import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Construit le "profil vivant" envoyé au coach à chaque échange.
 * C'est le grounding : le LLM ne voit que ces valeurs (déjà calculées),
 * jamais le brut Strava (cf. politique Strava : l'IA passe par le MCP, et le
 * coach travaille sur des métriques dérivées, pas sur des données API brutes).
 */
export async function buildAthleteContext() {
  const me = await prisma.athleteProfile.findUnique({
    where: { id: "me" },
    include: {
      goals: { where: { status: "ACTIVE" }, orderBy: { raceDate: "asc" } },
      dailyMetrics: { orderBy: { date: "desc" }, take: 1 },
      scores: { orderBy: { date: "desc" }, take: 1 },
    },
  });
  if (!me) throw new Error("Profil athlète absent — lance le seed.");

  const recent = await prisma.activity.findMany({
    where: { athleteId: "me" },
    orderBy: { startedAt: "desc" },
    take: 14,
    select: {
      startedAt: true,
      sport: true,
      name: true,
      distanceM: true,
      movingTimeS: true,
      elevationGainM: true,
      avgHr: true,
      trainingLoad: true,
      decoupling: true,
    },
  });

  const goal = me.goals[0];
  const today = me.dailyMetrics[0];
  const score = me.scores[0];

  const weekKm =
    recent
      .filter((a) => Date.now() - a.startedAt.getTime() < 7 * 86400000)
      .reduce((s, a) => s + (a.distanceM ?? 0), 0) / 1000;

  return {
    athlete: {
      firstName: me.firstName,
      weightKg: me.weightKg,
      maxHr: me.maxHr,
      restHr: me.restHr,
      thresholdPaceSecPerKm: me.thresholdPaceSecPerKm,
      hrZonesBpm: me.hrZonesBpm,
      paceZonesSecKm: me.paceZonesSecKm,
    },
    goal: goal
      ? {
          name: goal.name,
          raceDate: goal.raceDate.toISOString().slice(0, 10),
          daysToRace: Math.ceil((goal.raceDate.getTime() - Date.now()) / 86400000),
          distanceKm: goal.distanceM ? goal.distanceM / 1000 : null,
          elevationM: goal.elevationM,
          targetTimeS: goal.targetTimeS,
          notes: goal.notes,
        }
      : null,
    fitnessToday: today
      ? { ctl: today.ctl, atl: today.atl, tsb: today.tsb, readiness: today.readiness }
      : null,
    latestScore: score
      ? {
          overall: score.overall,
          endurance: score.endurance,
          resistance: score.resistance,
          speed: score.speed,
          recovery: score.recovery,
          regularity: score.regularity,
        }
      : null,
    last7daysKm: Math.round(weekKm * 10) / 10,
    recentActivities: recent.map((a) => ({
      date: a.startedAt.toISOString().slice(0, 10),
      sport: a.sport,
      name: a.name,
      km: a.distanceM ? Math.round((a.distanceM / 1000) * 10) / 10 : null,
      minutes: a.movingTimeS ? Math.round(a.movingTimeS / 60) : null,
      dPlus: a.elevationGainM,
      avgHr: a.avgHr,
      load: a.trainingLoad,
      decoupling: a.decoupling,
    })),
  };
}
