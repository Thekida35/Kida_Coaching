import { z } from "zod";

/** Schéma de sortie attendu du LLM pour un plan. Validé avant stockage. */
export const WorkoutZ = z.object({
  dayOffset: z.number().int().min(0).max(6).default(0), // 0 = lundi
  sport: z.enum(["RUN", "TRAIL", "ULTRA", "RIDE", "OTHER"]),
  type: z.enum([
    "easy",
    "long",
    "tempo",
    "threshold",
    "intervals",
    "recovery",
    "race",
    "rest",
    "strength",
  ]),
  title: z.string().min(1),
  description: z.string().default(""),
  targetDurationMin: z.number().positive().nullable().optional(),
  targetDistanceKm: z.number().positive().nullable().optional(),
  primaryZone: z.number().int().min(1).max(5).nullable().optional(),
});

export const WeekZ = z.object({
  weekIndex: z.number().int().min(0).default(0),
  phase: z.enum(["base", "build", "peak", "taper", "race"]),
  focus: z.string().default(""),
  targetKm: z.number().nonnegative().default(0),
  workouts: z.array(WorkoutZ).default([]),
});

export const PlanZ = z.object({
  name: z.string().default("Plan vers l'objectif"),
  rationale: z.string().default(""),
  weeks: z.array(WeekZ).min(1),
});

export type PlanLLM = z.infer<typeof PlanZ>;
export type WeekLLM = z.infer<typeof WeekZ>;
export type WorkoutLLM = z.infer<typeof WorkoutZ>;
