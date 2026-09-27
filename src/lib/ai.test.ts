import { afterEach, describe, expect, it, vi } from "vitest";

// Faux SDK Anthropic et OpenAI : on vérifie ce qui leur est envoyé, pas le vrai modèle.
const sent: Record<string, unknown>[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    static RateLimitError = class extends Error {};
    beta = {
      messages: {
        stream: (p: Record<string, unknown>) => {
          sent.push({ claude: p });
          return {
            abort: () => {},
            async *[Symbol.asyncIterator]() {
              yield { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "…" } };
              yield { type: "content_block_delta", delta: { type: "text_delta", text: "**Verdict :** " } };
              yield { type: "content_block_delta", delta: { type: "text_delta", text: "GO. 👊" } };
            },
          };
        },
      },
    };
  }
  return { default: Anthropic };
});
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (p: Record<string, unknown>) => {
          sent.push({ gemini: p });
          return { controller: { abort() {} }, async *[Symbol.asyncIterator]() { yield { choices: [{ delta: { content: "Gemini" } }] }; } };
        },
      },
    };
  },
}));

const { coachComplete } = await import("./ai");
const ctx = { system: "CONTEXTE STABLE", now: "Nous sommes le 27 septembre." };

afterEach(() => {
  sent.length = 0;
  delete process.env.ANTHROPIC_API_KEY;
});

describe("coach : choix du modèle", () => {
  it("utilise Claude quand la clé est là : contexte en cache, date à part, relais en cas de refus", async () => {
    process.env.ANTHROPIC_API_KEY = "x";
    expect(await coachComplete(ctx, "Ma séance ?")).toBe("**Verdict :** GO. 👊");
    const p = sent[0].claude as Record<string, unknown>;
    expect(p.model).toBe("claude-opus-5");
    expect(p.system).toEqual([
      { type: "text", text: "CONTEXTE STABLE", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Nous sommes le 27 septembre." },
    ]);
    expect(p).toMatchObject({ thinking: { type: "adaptive" }, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(p.messages).toEqual([{ role: "user", content: "Ma séance ?" }]);
  });

  it("reste sur Gemini sans clé Anthropic", async () => {
    expect(await coachComplete(ctx, "Ma séance ?")).toBe("Gemini");
    const p = sent[0].gemini as { messages: { role: string; content: string }[] };
    expect(p.messages[0]).toEqual({ role: "system", content: "Nous sommes le 27 septembre.\nCONTEXTE STABLE" });
  });
});
