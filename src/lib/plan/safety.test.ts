import { describe, it, expect } from "vitest";
import { clampProgression, enforceTaper, safeWeeklyKm } from "./safety";

describe("clampProgression", () => {
  it("plafonne une hausse trop forte à +10 %", () => {
    expect(clampProgression([40, 60], 0.1)).toEqual([40, 44]);
  });
  it("laisse passer une progression raisonnable", () => {
    expect(clampProgression([40, 43], 0.1)).toEqual([40, 43]);
  });
  it("propage le plafonnement en cascade", () => {
    const out = clampProgression([40, 80, 80], 0.1);
    expect(out[1]).toBe(44);
    expect(out[2]).toBe(48); // 44*1.1 = 48.4 → 48
  });
});

describe("enforceTaper", () => {
  it("réduit les 2 dernières semaines avant la course", () => {
    const out = enforceTaper([50, 60, 70, 70, 70]);
    expect(out[4]).toBeLessThanOrEqual(Math.round(70 * 0.55));
    expect(out[3]).toBeLessThanOrEqual(Math.round(70 * 0.75));
  });
  it("ne fait que réduire, jamais augmenter", () => {
    const out = enforceTaper([50, 20, 10]);
    expect(out[2]).toBeLessThanOrEqual(10);
  });
});

describe("safeWeeklyKm", () => {
  it("combine progression bornée et affûtage", () => {
    const out = safeWeeklyKm([40, 80, 80, 80], 0.1);
    // progression bornée d'abord → [40,44,48,53], puis taper sur les 2 dernières
    expect(out[1]).toBe(44);
    expect(out[3]).toBeLessThan(out[1] + 100); // dernière semaine réduite
    expect(out[3]).toBeLessThanOrEqual(out[2]);
  });
});
