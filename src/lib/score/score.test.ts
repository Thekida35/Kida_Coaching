import { describe, it, expect } from "vitest";
import { computeScore, ScoreInputs } from "./score";

const base: ScoreInputs = {
  ctl: 80,
  tsb: 0,
  longestRunKm30d: 24,
  avgDecoupling30d: 6,
  thresholdMin30d: 120,
  z5Min30d: 10,
  bestPaceSecPerKm30d: 230,
  thresholdPaceSecPerKm: 236,
  hrv: null,
  hrvBaseline: null,
  restHr: null,
  restHrBaseline: null,
  activeDays28: 20,
  weeklyVolumeCv: 0.25,
};
const with_ = (o: Partial<ScoreInputs>): ScoreInputs => ({ ...base, ...o });

describe("computeScore — bornes", () => {
  it("toutes les dimensions sont dans [0,100]", () => {
    const s = computeScore(base);
    for (const v of [s.overall, s.endurance, s.resistance, s.speed, s.recovery, s.regularity]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("inputs nuls → score bas ; inputs très bons → score haut", () => {
    const low = computeScore(
      with_({
        ctl: 0,
        tsb: -25,
        longestRunKm30d: 0,
        avgDecoupling30d: 15,
        thresholdMin30d: 0,
        z5Min30d: 0,
        bestPaceSecPerKm30d: 320,
        activeDays28: 1,
        weeklyVolumeCv: 0.7,
      })
    );
    const high = computeScore(
      with_({
        ctl: 160,
        tsb: 15,
        longestRunKm30d: 40,
        avgDecoupling30d: 1,
        thresholdMin30d: 260,
        z5Min30d: 35,
        bestPaceSecPerKm30d: 200,
        activeDays28: 26,
        weeklyVolumeCv: 0.1,
      })
    );
    expect(high.overall).toBeGreaterThan(low.overall);
    expect(low.overall).toBeLessThan(40);
    expect(high.overall).toBeGreaterThan(80);
  });
});

describe("computeScore — monotonies", () => {
  it("plus de CTL → plus d'endurance", () => {
    expect(computeScore(with_({ ctl: 120 })).endurance).toBeGreaterThan(
      computeScore(with_({ ctl: 40 })).endurance
    );
  });
  it("plus de TSB → meilleure récupération", () => {
    expect(computeScore(with_({ tsb: 15 })).recovery).toBeGreaterThan(
      computeScore(with_({ tsb: -15 })).recovery
    );
  });
  it("plus de jours actifs → meilleure régularité", () => {
    expect(computeScore(with_({ activeDays28: 26 })).regularity).toBeGreaterThan(
      computeScore(with_({ activeDays28: 8 })).regularity
    );
  });
  it("plus de temps en Z5 → plus de vitesse", () => {
    expect(computeScore(with_({ z5Min30d: 30 })).speed).toBeGreaterThan(
      computeScore(with_({ z5Min30d: 2 })).speed
    );
  });
  it("découplage plus faible → plus d'endurance (meilleure durabilité)", () => {
    expect(computeScore(with_({ avgDecoupling30d: 1 })).endurance).toBeGreaterThan(
      computeScore(with_({ avgDecoupling30d: 11 })).endurance
    );
  });
});

describe("computeScore — pondération globale", () => {
  it("la note globale = somme pondérée des dimensions", () => {
    const s = computeScore(base);
    const expected = Math.round(
      0.3 * s.endurance + 0.15 * s.resistance + 0.15 * s.speed + 0.2 * s.recovery + 0.2 * s.regularity
    );
    expect(s.overall).toBe(expected);
  });

  it("la récupération ignore HRV/FC repos absents et se base sur le TSB seul", () => {
    // base n'a ni hrv ni restHr → recovery dérive du seul tsbComp
    const s = computeScore(with_({ tsb: 0 }));
    expect(s.recovery).toBe(50); // 50 + 0*2.5
  });
});
