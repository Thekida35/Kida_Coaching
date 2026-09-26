import { NextRequest, NextResponse } from "next/server";
import { aiClient, AI_MODEL } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Appel au coach (Gemini). body: { messages: {role:"user"|"assistant", content}[], json?: boolean } */
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "sampling_disabled" }, { status: 503 });
  const b = await req.json().catch(() => null);
  const msgs = Array.isArray(b?.messages) ? b.messages : [];
  const clean = msgs
    .filter((m: { role: string; content: unknown }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content)
    .slice(-16)
    .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 20000) }));
  if (!clean.length) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const r = await aiClient().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "Tu es le coach de course à pied de Killian, dans son app Kida. Réponds en français. N'invente aucun chiffre absent des données fournies. Pas de diagnostic médical : en cas de douleur ou de fièvre, conseille un avis médical." + (b?.json ? " Réponds uniquement par un objet JSON valide." : "") },
        ...clean,
      ],
      ...(b?.json ? { response_format: { type: "json_object" as const } } : {}),
    });
    const text = r.choices[0]?.message?.content ?? "";
    if (!text.trim()) return NextResponse.json({ error: "empty_completion" }, { status: 502 });
    return NextResponse.json({ text, truncated: r.choices[0]?.finish_reason === "length" });
  } catch (e) {
    console.error("[/api/ai]", e);
    const status = (e as { status?: number }).status;
    return NextResponse.json({ error: status === 429 ? "rate_limited" : "upstream_error" }, { status: status === 429 ? 429 : 502 });
  }
}
