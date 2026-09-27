import { beforeEach, describe, expect, it, vi } from "vitest";
import { FitEncoder, FitBaseType as T } from "fit-file-parser/encoder";

const kv = new Map<string, unknown>();
vi.mock("@/lib/hub/db", () => ({ kvGet: async (k: string) => kv.get(k) ?? null, kvSet: async (k: string, v: unknown) => void kv.set(k, v) }));

const { addFile, deleteFile, filesContext, kindOf, listFiles, readTrack, CONTEXT_CHARS } = await import("./files");

/** Petite séance .fit : 2 km à 4,2 m/s (3:58/km), deux tours. */
function fakeFit() {
  const e = new FitEncoder();
  const t0 = Date.parse("2026-09-24T06:00:00Z");
  const ts = (s: number) => FitEncoder.toFitTimestamp(new Date(t0 + s * 1000));
  const u32 = (number: number, value: number) => ({ number, size: 4, baseType: T.Uint32, value });
  const u8 = (number: number, value: number) => ({ number, size: 1, baseType: T.Uint8, value });
  e.writeMessage(0, [{ number: 0, size: 1, baseType: T.Enum, value: 4 }]);
  for (let s = 0; s <= 480; s += 4) e.writeMessage(20, [u32(253, ts(s)), u8(3, 150 + Math.round(s / 20)), u32(5, Math.round(s * 420))]);
  for (const [a, b] of [[0, 240], [240, 480]]) e.writeMessage(19, [u32(253, ts(b)), u32(2, ts(a)), u32(8, (b - a) * 1000), u32(9, (b - a) * 420), u8(15, 160), u8(16, 170)]);
  e.writeMessage(18, [u32(253, ts(480)), u32(2, ts(0)), { number: 5, size: 1, baseType: T.Enum, value: 1 }, u32(8, 480000), u32(9, 201600), u8(16, 162), u8(17, 174)]);
  return Buffer.from(e.close());
}

const gpx = `<?xml version="1.0"?><gpx><trk><name>Footing du soir</name><trkseg>
${Array.from({ length: 30 }, (_, i) => `<trkpt lat="${(48 + i * 0.0009).toFixed(5)}" lon="-1.6"><ele>${40 + i}</ele><time>2026-09-24T18:${String(Math.floor((i * 24) / 60)).padStart(2, "0")}:${String((i * 24) % 60).padStart(2, "0")}Z</time><extensions><gpxtpx:hr>${140 + i}</gpxtpx:hr></extensions></trkpt>`).join("\n")}
</trkseg></trk></gpx>`;

beforeEach(() => kv.clear());

describe("fichiers du coach", () => {
  it("reconnaît les types", () => {
    expect(kindOf("IMG_1.HEIC", "")).toBe("image");
    expect(kindOf("bilan.pdf", "application/pdf")).toBe("pdf");
    expect(kindOf("seance.fit", "application/octet-stream")).toBe("seance");
    expect(kindOf("suivi.xlsx", "")).toBe("tableur");
    expect(kindOf("notes.txt", "text/plain")).toBe("texte");
    expect(kindOf("video.mov", "video/quicktime")).toBeNull();
  });

  it("résume une séance .fit : allure, FC, tours, kilomètres", async () => {
    const f = await addFile("seance.fit", "application/octet-stream", fakeFit());
    expect(f.summary).toContain("2.02 km");
    expect(f.summary).toContain("FC moy 162 / max 174");
    expect(f.text).toContain("Tours :\n1. 1.01 km en 4:00");
    expect(f.text).toMatch(/km 1 : 3:5\d\/km · FC \d+/);
  });

  it("lit une trace .gpx", () => {
    const r = readTrack(gpx);
    expect(r.text).toContain("« Footing du soir »");
    expect(r.text).toContain("D+ 29 m");
    expect(r.text).toMatch(/km 1 : \d:\d\d\/km · FC \d+ · dénivelé \+\d+ m/);
  });

  it("lit une photo avec Gemini et garde la fiche", async () => {
    process.env.GEMINI_API_KEY = "x";
    const fetch = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text: "Tableau : 3 × 2000 m @ 3:42.\nRésumé : plan de la semaine." }] } }] }));
    vi.stubGlobal("fetch", fetch);
    const f = await addFile("plan.jpg", "image/jpeg", Buffer.from("fake"));
    expect(f.summary).toBe("plan de la semaine.");
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.contents[0].parts[0].inline_data).toEqual({ mime_type: "image/jpeg", data: Buffer.from("fake").toString("base64") });
    expect((await listFiles()).map((x) => x.name)).toEqual(["plan.jpg"]);
    await deleteFile(f.id);
    expect(await listFiles()).toEqual([]);
  });

  it("recopie un CSV et refuse les fichiers vides ou inconnus", async () => {
    const f = await addFile("suivi.csv", "text/csv", Buffer.from("date;km\n2026-09-20;12"));
    expect(f.text).toContain("2026-09-20;12");
    await expect(addFile("vide.txt", "text/plain", Buffer.alloc(0))).rejects.toThrow("Fichier vide");
    await expect(addFile("film.mov", "video/quicktime", Buffer.from("x"))).rejects.toThrow("non pris en charge");
  });

  it("donne au coach les fiches les plus récentes d'abord, sans dépasser la limite", () => {
    const big = (n: string, t: number) => ({ id: n, name: n, kind: "texte" as const, size: 1, t, summary: `résumé ${n}`, text: "x".repeat(CONTEXT_CHARS * 0.6) });
    const ctx = filesContext([big("récent", 2), big("ancien", 1)]);
    expect(ctx.indexOf("récent")).toBeLessThan(ctx.indexOf("ancien"));
    expect(ctx).toContain("ancien : trop long pour être relu en entier. Résumé : résumé ancien");
    expect(ctx.length).toBeLessThan(CONTEXT_CHARS + 500);
  });
});
