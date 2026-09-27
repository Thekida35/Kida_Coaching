import { NextRequest, NextResponse } from "next/server";
import { aiClient, AI_MODEL } from "@/lib/ai";
import { coachContext } from "@/lib/hub/coachContext";
import { CONTEXT_TURNS, loadChat, saveChat, type ChatMsg } from "@/lib/hub/chat";
import { listFiles } from "@/lib/hub/files";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Historique de la conversation avec le coach. */
export async function GET() {
  return NextResponse.json({ messages: await loadChat() });
}

/** Nouvelle conversation. */
export async function DELETE() {
  await saveChat([]);
  return NextResponse.json({ ok: true });
}

/**
 * POST { message, raceId?, fileIds? } → réponse du coach en texte brut, envoyée au fil de l'eau.
 * L'historique est gardé côté serveur : la question est enregistrée tout de suite,
 * la réponse (même partielle si la connexion coupe) à la fin du flux.
 */
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "sampling_disabled" }, { status: 503 });
  const b = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(b?.fileIds) ? b.fileIds.filter((x: unknown) => typeof x === "string").slice(0, 10) : [];
  const files = ids.length ? (await listFiles()).filter((f) => ids.includes(f.id)).map(({ id, name, kind }) => ({ id, name, kind })) : [];
  let message = typeof b?.message === "string" ? b.message.trim().slice(0, 8000) : "";
  if (!message && files.length) message = files.length > 1 ? "Voici des fichiers. Qu'en retiens-tu ?" : "Voici un fichier. Qu'en retiens-tu ?";
  if (!message) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const [history, ctx] = await Promise.all([loadChat(), coachContext(typeof b?.raceId === "string" ? b.raceId : null)]);
  const msgs: ChatMsg[] = [...history, { role: "user", content: message, t: Date.now(), ...(files.length ? { files } : {}) }];
  await saveChat(msgs);

  let completion;
  try {
    completion = await aiClient().chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [{ role: "system", content: ctx }, ...msgs.slice(-CONTEXT_TURNS).map(({ role, content, files: f }) => ({
        role,
        content: f?.length ? `${content}\n\n[Fichier(s) joint(s) : ${f.map((x) => x.name).join(", ")} — leur fiche est dans DOCUMENTS DONNÉS PAR KILLIAN.]` : content,
      }))],
    });
  } catch (e) {
    console.error("[/api/coach/chat]", e);
    const status = (e as { status?: number }).status;
    return NextResponse.json({ error: status === 429 ? "rate_limited" : "upstream_error" }, { status: status === 429 ? 429 : 502 });
  }

  const enc = new TextEncoder();
  let text = "";
  let saved = false;
  const finish = async (note = "") => {
    if (saved) return;
    saved = true;
    if (text || note) await saveChat([...msgs, { role: "assistant", content: text + note, t: Date.now() }]);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          text += delta;
          controller.enqueue(enc.encode(delta));
        }
        await finish();
      } catch (e) {
        console.error("[/api/coach/chat] stream", e);
        const note = "\n\n_(Réponse interrompue.)_";
        controller.enqueue(enc.encode(note));
        await finish(note);
      }
      controller.close();
    },
    async cancel() {
      completion.controller.abort();
      await finish("\n\n_(Arrêté.)_");
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
