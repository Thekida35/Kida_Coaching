import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/**
 * Modèles IA du coach.
 * - Claude (Anthropic) dès que ANTHROPIC_API_KEY est présente sur Vercel ; modèle réglable par CLAUDE_MODEL.
 * - Sinon Gemini (GEMINI_API_KEY) via sa couche compatible OpenAI. Gemini sert aussi à lire les photos/PDF (lib/hub/files).
 */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

export function aiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export const useClaude = () => !!process.env.ANTHROPIC_API_KEY;
export const coachReady = () => useClaude() || !!process.env.GEMINI_API_KEY;

/** Contexte du coach : `system` (stable, mis en cache) et `now` (date du jour, hors cache). */
export type Ctx = { system: string; now: string };
export type Turn = { role: "user" | "assistant"; content: string };

export class RateLimited extends Error {}

/**
 * Réponse du coach au fil de l'eau. `stream` produit les morceaux de texte ; `abort` coupe la génération.
 */
export async function coachStream(ctx: Ctx, turns: Turn[]): Promise<{ stream: AsyncIterable<string>; abort: () => void }> {
  if (useClaude()) {
    const s = new Anthropic().beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      // si le filtre de sécurité refuse (ex. un bilan sanguin), un autre modèle Claude prend le relais
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: ctx.system, cache_control: { type: "ephemeral" } },
        { type: "text", text: ctx.now },
      ],
      messages: turns,
    } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
    return {
      abort: () => s.abort(),
      stream: (async function* () {
        try {
          for await (const e of s) if (e.type === "content_block_delta" && e.delta.type === "text_delta") yield e.delta.text;
        } catch (e) {
          if (e instanceof Anthropic.RateLimitError) throw new RateLimited();
          throw e;
        }
      })(),
    };
  }
  let c;
  try {
    c = await aiClient().chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [{ role: "system", content: `${ctx.now}\n${ctx.system}` }, ...turns],
    });
  } catch (e) {
    if ((e as { status?: number }).status === 429) throw new RateLimited();
    throw e;
  }
  return {
    abort: () => c.controller.abort(),
    stream: (async function* () {
      for await (const chunk of c) {
        const d = chunk.choices[0]?.delta?.content;
        if (d) yield d;
      }
    })(),
  };
}

/** Réponse complète en une fois (analyse automatique des sorties). */
export async function coachComplete(ctx: Ctx, prompt: string): Promise<string> {
  const { stream } = await coachStream(ctx, [{ role: "user", content: prompt }]);
  let text = "";
  for await (const d of stream) text += d;
  return text.trim();
}
