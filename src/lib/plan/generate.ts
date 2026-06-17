import { PrismaClient } from "@prisma/client";
import { planSystemPrompt } from "./prompt";
import { PlanZ } from "./schema";
import { safeWeeklyKm } from "./safety";
import { buildAthleteContext } from "../coach/athlete-context";
import { aiClient, AI_MODEL } from "../ai";

const prisma = new PrismaClient();
const openai = aiClient();
const DAY = 86400000;

/** Génère, sécurise et enregistre un plan jusqu'à la course. */
export async function generatePlan(athleteId = "me") {
  const goal = await prisma.goal.findFirst({
    where: { athleteId, status: "ACTIVE" },
    orderBy: { raceDate: "asc" },
  });
  if (!goal) throw new Error("no_active_goal");

  const daysToRace = Math.ceil((goal.raceDate.getTime() - Date.now()) / DAY);
  const weeksRemaining = Math.max(1, Math.min(16, Math.ceil(daysToRace / 7)));
  const context = await buildAthleteContext();

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          planSystemPrompt(weeksRemaining) +
          "\n\nCONTEXTE ATHLÈTE (factuel) :\n" +
          JSON.stringify(context, null, 2),
      },
      { role: "user", content: `Génère mon plan sur ${weeksRemaining} semaines jusqu'à la course (${goal.name}).` },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  // Gemini peut renvoyer l'objet {name,weeks}, un tableau [plan], ou directement
  // la liste des semaines, ou un objet enveloppe {plan:{...}}. On extrait proprement.
  const payload = extractPlan(JSON.parse(raw));
  const parsed = PlanZ.parse(payload);

  // ── Garde-fous déterministes sur le volume hebdo ──
  const ordered = [...parsed.weeks].sort((a, b) => a.weekIndex - b.weekIndex);
  const safeKm = safeWeeklyKm(ordered.map((w) => w.targetKm));

  // ── Dates concrètes : on démarre le lundi à venir ──
  const start = nextMonday();
  const endDate = new Date(start.getTime() + (ordered.length * 7 - 1) * DAY);

  // ── Persistance (remplace le plan précédent pour cet objectif) ──
  await prisma.plan.deleteMany({ where: { athleteId, goalId: goal.id } });

  const plan = await prisma.plan.create({
    data: {
      athleteId,
      goalId: goal.id,
      name: parsed.name,
      startDate: start,
      endDate,
      generatedBy: AI_MODEL,
      weeks: {
        create: ordered.map((w, idx) => {
          const weekStart = new Date(start.getTime() + idx * 7 * DAY);
          return {
            weekIndex: idx,
            startDate: weekStart,
            phase: w.phase,
            targetKm: safeKm[idx],
            workouts: {
              create: w.workouts.map((wo) => ({
                date: new Date(weekStart.getTime() + wo.dayOffset * DAY),
                sport: wo.sport as any,
                title: wo.title,
                description: wo.description,
                structureJson: { type: wo.type, primaryZone: wo.primaryZone ?? null } as any,
                targetDistanceM: wo.targetDistanceKm ? Math.round(wo.targetDistanceKm * 1000) : null,
                targetDurationS: wo.targetDurationMin ? Math.round(wo.targetDurationMin * 60) : null,
              })),
            },
          };
        }),
      },
    },
    include: { weeks: { include: { workouts: true }, orderBy: { weekIndex: "asc" } } },
  });

  return { plan, rationale: parsed.rationale, weeksRemaining };
}

function nextMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dim
  const add = day === 1 ? 0 : (8 - day) % 7 || 7;
  return new Date(d.getTime() + add * DAY);
}

/**
 * Extrait l'objet plan {name, rationale, weeks} quel que soit l'emballage renvoyé
 * par le LLM : objet direct, tableau [plan], liste de semaines, ou {plan:{...}}.
 */
function extractPlan(input: any): any {
  let p = input;
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(p)) {
      // tableau de semaines (chaque élément a workouts/weekIndex/phase) ?
      if (p.length && (p[0]?.workouts || p[0]?.weekIndex != null || p[0]?.phase)) {
        return { name: "Plan vers l'objectif", rationale: "", weeks: p };
      }
      p = p[0] ?? {};
      continue;
    }
    if (p && typeof p === "object") {
      if (Array.isArray(p.weeks)) {
        if (!p.name) p.name = "Plan vers l'objectif";
        return p;
      }
      const wrap = ["plan", "trainingPlan", "data", "result", "response", "output"].find(
        (k) => p[k] != null
      );
      if (wrap) {
        p = p[wrap];
        continue;
      }
      const keys = Object.keys(p);
      if (keys.length === 1) {
        p = p[keys[0]];
        continue;
      }
    }
    break;
  }
  return p;
}
