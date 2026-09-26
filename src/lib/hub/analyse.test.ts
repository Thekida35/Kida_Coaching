import { beforeEach, describe, expect, it, vi } from "vitest";

// Tout ce qui touche au réseau ou à la base est simulé : on teste la logique du coach proactif.
const kv = new Map<string, unknown>();
const strava = { list: [] as unknown[], detail: {} as Record<string, unknown> };
const sent: { title: string; body: string; url?: string }[] = [];
let chat: { role: string; content: string }[] = [];

vi.mock("@/lib/hub/db", () => ({ kvGet: async (k: string) => kv.get(k) ?? null, kvSet: async (k: string, v: unknown) => void kv.set(k, v) }));
vi.mock("@/lib/hub/strava", () => ({
  stravaConfigured: () => true,
  api: async (p: string) => (p.startsWith("/athlete/activities") ? strava.list : strava.detail),
}));
vi.mock("@/lib/hub/coachContext", () => ({ coachContext: async () => "contexte" }));
vi.mock("@/lib/hub/chat", () => ({ loadChat: async () => chat, saveChat: async (m: typeof chat) => void (chat = m) }));
vi.mock("@/lib/hub/push", () => ({ sendAll: async (p: (typeof sent)[number]) => void sent.push(p) }));
vi.mock("@/lib/ai", () => ({
  AI_MODEL: "test",
  aiClient: () => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: "**Verdict :** séance réussie, allure tenue.\n\n### Détail\n…" } }] }) } } }),
}));

const { analyseNewRun, verdictLine, describe: describeRun } = await import("./analyse");

const NOW = Date.parse("2026-09-26T18:00:00Z");
const run = (id: number, hoursAgo: number, sport_type = "Run") => ({ id, name: `Sortie ${id}`, sport_type, start_date: new Date(NOW - hoursAgo * 3600e3).toISOString() });

describe("coach proactif", () => {
  beforeEach(() => {
    kv.clear();
    sent.length = 0;
    chat = [];
    process.env.GEMINI_API_KEY = "x";
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 })); // météo indisponible
    strava.detail = { id: 2, name: "Sortie 2", sport_type: "Run", start_date_local: "2026-09-26T17:00:00Z", distance: 10000, moving_time: 2400, elapsed_time: 2450, start_latlng: [48.1, -1.6] };
  });

  it("prend la dernière sortie comme point de départ sans la commenter", async () => {
    strava.list = [run(1, 2)];
    expect(await analyseNewRun(NOW)).toBe("point de départ");
    expect(kv.get("analysed")).toEqual({ lastId: 1 });
    expect(sent).toHaveLength(0);
  });

  it("analyse une nouvelle course : message dans le chat et notification", async () => {
    kv.set("analysed", { lastId: 1 });
    strava.list = [run(2, 1), run(1, 30)];
    expect(await analyseNewRun(NOW)).toBe("analysée : Sortie 2");
    expect(chat.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(chat[0].content).toContain("Sortie 2");
    expect(sent[0]).toMatchObject({ title: "📊 Analyse prête · Sortie 2", body: "séance réussie, allure tenue.", url: "/?v=coach" });
    expect(await analyseNewRun(NOW)).toBe("rien de nouveau"); // pas deux fois
  });

  it("ignore le vélo et les sorties trop anciennes", async () => {
    kv.set("analysed", { lastId: 1 });
    strava.list = [run(3, 1, "Ride"), run(2, 48)];
    expect(await analyseNewRun(NOW)).toBe("rien de nouveau");
    expect(kv.get("analysed")).toEqual({ lastId: 2 });
    expect(sent).toHaveLength(0);
  });
});

describe("mise en forme", () => {
  it("tire le verdict de la réponse", () => {
    expect(verdictLine("### Titre\n**Verdict :** bien couru.")).toBe("bien couru.");
  });
  it("décrit la sortie avec allure et kilomètres", () => {
    const t = describeRun({ id: 1, name: "Seuil", sport_type: "Run", start_date: "", start_date_local: "2026-09-26T07:00:00Z", distance: 2000, moving_time: 440, elapsed_time: 450, splits_metric: [{ split: 1, distance: 1000, moving_time: 220, average_heartrate: 176 }] }, "15 °C");
    expect(t).toContain("allure 3:40/km");
    expect(t).toContain("km 1 : 3:40/km · FC 176");
  });
});
