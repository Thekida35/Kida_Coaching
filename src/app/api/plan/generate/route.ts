import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/plan/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/plan/generate → génère et enregistre le plan jusqu'à la course. */
export async function POST() {
  try {
    const result = await generatePlan();
    return NextResponse.json({
      ok: true,
      planId: result.plan.id,
      weeks: result.plan.weeks.length,
      rationale: result.rationale,
    });
  } catch (err: any) {
    console.error("[/api/plan/generate]", err);
    const msg = err?.message === "no_active_goal" ? "Aucun objectif actif" : "plan_generation_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
