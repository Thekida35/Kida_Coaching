import { NextRequest, NextResponse } from "next/server";
import { COACH_SYSTEM_PROMPT, flagUnsafeAdvice } from "@/lib/coach/system-prompt";
import { buildAthleteContext } from "@/lib/coach/athlete-context";
import { aiClient, AI_MODEL } from "@/lib/ai";

export const runtime = "nodejs";

const openai = aiClient();

/**
 * POST /api/coach
 * body: { messages: {role, content}[] }
 * Le coach reçoit l'historique + un bloc de contexte athlète GROUNDED (chiffres
 * déjà calculés). Le LLM ne calcule rien lui-même.
 */
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const context = await buildAthleteContext();

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            COACH_SYSTEM_PROMPT +
            "\n\nCONTEXTE ATHLÈTE (chiffres factuels, déjà calculés — ne pas recalculer) :\n" +
            JSON.stringify(context, null, 2),
        },
        ...(Array.isArray(messages) ? messages : []),
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const flags = flagUnsafeAdvice(reply);

    return NextResponse.json({
      reply,
      // Traçabilité : on renvoie ce que le coach avait sous les yeux (à logguer en base)
      context,
      safetyFlags: flags,
    });
  } catch (err) {
    console.error("[/api/coach]", err);
    return NextResponse.json({ error: "coach_failed" }, { status: 500 });
  }
}
