import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { buildScoreInputs } from "@/lib/score/inputs";
import { computeScore } from "@/lib/score/score";

const prisma = new PrismaClient();
export const runtime = "nodejs";

/**
 * GET /api/score            → dernier ScoreSnapshot en base
 * GET /api/score?fresh=1    → recalcule à la volée (sans stocker)
 */
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("fresh") === "1") {
      const inputs = await buildScoreInputs();
      return NextResponse.json({ fresh: true, score: computeScore(inputs), inputs });
    }
    const snap = await prisma.scoreSnapshot.findFirst({
      where: { athleteId: "me" },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ fresh: false, score: snap });
  } catch (err) {
    console.error("[/api/score]", err);
    return NextResponse.json({ error: "score_failed" }, { status: 500 });
  }
}
