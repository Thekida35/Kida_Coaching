import { PrismaClient } from "@prisma/client";
import { NormalizedActivity, toActivityData, AthleteRefs } from "./normalize";
import { fetchRecentActivities } from "../mcp/getfast";
import { recomputeDailyMetrics } from "./daily";

const prisma = new PrismaClient();

async function athleteRefs(athleteId = "me"): Promise<AthleteRefs> {
  const me = await prisma.athleteProfile.findUniqueOrThrow({ where: { id: athleteId } });
  return {
    restHr: me.restHr,
    maxHr: me.maxHr,
    hrZonesBpm: me.hrZonesBpm,
    paceZonesSecKm: me.paceZonesSecKm,
  };
}

/**
 * Enregistre UNE activité normalisée (idempotent sur source+externalId).
 * Calcule la charge + zones + découplage au passage.
 */
export async function upsertActivity(n: NormalizedActivity, athleteId = "me") {
  const refs = await athleteRefs(athleteId);
  const data = toActivityData(n, refs);

  if (data.externalId) {
    return prisma.activity.upsert({
      where: { source_externalId: { source: data.source as any, externalId: data.externalId } },
      update: { ...data, athleteId } as any,
      create: { ...data, athleteId } as any,
    });
  }
  return prisma.activity.create({ data: { ...data, athleteId } as any });
}

/**
 * Synchronise les N dernières activités depuis Strava (via MCP GetFast),
 * puis recalcule la forme. Renvoie le nombre d'activités traitées.
 */
export async function syncFromStrava(limit = 30, athleteId = "me"): Promise<number> {
  const activities = await fetchRecentActivities(limit);
  for (const a of activities) {
    await upsertActivity(a, athleteId);
  }
  await recomputeDailyMetrics(athleteId);
  return activities.length;
}

/** Ingestion d'un fichier FIT déjà parsé. */
export async function ingestFit(n: NormalizedActivity, athleteId = "me") {
  const saved = await upsertActivity(n, athleteId);
  await recomputeDailyMetrics(athleteId);
  return saved;
}
