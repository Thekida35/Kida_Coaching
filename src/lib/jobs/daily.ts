import { PrismaClient } from "@prisma/client";
import { recomputeDailyMetrics } from "../ingest/daily";
import { buildScoreInputs } from "../score/inputs";
import { computeScore } from "../score/score";

const prisma = new PrismaClient();

/**
 * Tâche quotidienne : reconstruit la forme (CTL/ATL/TSB), calcule le score 0‑100,
 * met à jour la readiness du jour. À déclencher par cron (voir api/cron/daily).
 */
export async function runDailyJob(athleteId = "me") {
  // 1) Forme à jour
  const points = await recomputeDailyMetrics(athleteId);

  // 2) Score du jour (auditable : on stocke les inputs)
  const inputs = await buildScoreInputs(athleteId);
  const score = computeScore(inputs);
  const today = new Date(new Date().toISOString().slice(0, 10));

  await prisma.scoreSnapshot.upsert({
    where: { athleteId_date: { athleteId, date: today } },
    update: {
      overall: score.overall,
      endurance: score.endurance,
      resistance: score.resistance,
      speed: score.speed,
      recovery: score.recovery,
      regularity: score.regularity,
      inputsJson: { inputs, components: score.components } as any,
    },
    create: {
      athleteId,
      date: today,
      overall: score.overall,
      endurance: score.endurance,
      resistance: score.resistance,
      speed: score.speed,
      recovery: score.recovery,
      regularity: score.regularity,
      inputsJson: { inputs, components: score.components } as any,
    },
  });

  // 3) Readiness du jour = dimension Récupération (alimente l'anneau du dashboard)
  await prisma.dailyMetric.updateMany({
    where: { athleteId, date: today },
    data: { readiness: score.recovery },
  });

  return { fitnessDays: points, score };
}
