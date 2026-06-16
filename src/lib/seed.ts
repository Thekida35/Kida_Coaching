import { PrismaClient, Sport, GoalStatus } from "@prisma/client";

/** Injecte le profil de Killian + son objectif. Idempotent. */
export async function seedKillian(prisma: PrismaClient) {
  const me = await prisma.athleteProfile.upsert({
    where: { id: "me" },
    update: {},
    create: {
      id: "me",
      firstName: "Killian",
      weightKg: 62,
      city: "Saint-Aubin-du-Cormier",
      country: "France",
      maxHr: 196,
      restHr: 45,
      thresholdPaceSecPerKm: 236,
      runningPowerFtp: 138,
      hrZonesBpm: [125, 156, 172, 187],
      paceZonesSecKm: [305, 262, 236, 221, 207],
    },
  });

  await prisma.goal.upsert({
    where: { id: "goal-ultramarin-2026" },
    update: {},
    create: {
      id: "goal-ultramarin-2026",
      athleteId: me.id,
      name: "Ultra Marin — l'Avor",
      sport: Sport.ULTRA,
      raceDate: new Date("2026-06-27T07:00:00+02:00"),
      distanceM: 60000,
      elevationM: 600,
      targetTimeS: null,
      priority: 1,
      status: GoalStatus.ACTIVE,
      notes: "Ultra côtier (Golfe du Morbihan), terrain plutôt roulant. Gérer chaleur + ravitaillement.",
    },
  });

  return me;
}
