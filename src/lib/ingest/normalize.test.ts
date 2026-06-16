import { describe, it, expect } from "vitest";
import { toActivityData, mapSport, isLikelySame, AthleteRefs, NormalizedActivity } from "./normalize";
import { activitiesToFitness, dailyLoadMap } from "./aggregate";

const REFS: AthleteRefs = {
  restHr: 45,
  maxHr: 196,
  hrZonesBpm: [125, 156, 172, 187],
  paceZonesSecKm: [305, 262, 236, 221, 207],
};

describe("mapSport", () => {
  it("reconnaît trail / run / ride", () => {
    expect(mapSport("TrailRun")).toBe("TRAIL");
    expect(mapSport("Run")).toBe("RUN");
    expect(mapSport("Ride")).toBe("RIDE");
    expect(mapSport("Workout")).toBe("OTHER");
  });
});

describe("toActivityData", () => {
  it("utilise le relative_effort Strava comme charge", () => {
    const n: NormalizedActivity = {
      source: "STRAVA",
      externalId: "1",
      sport: "RUN",
      startedAt: new Date("2026-06-09T08:10:00Z"),
      movingTimeS: 3456,
      avgHr: 165,
      relativeEffort: 151,
    };
    const d = toActivityData(n, REFS);
    expect(d.trainingLoad).toBe(151);
    expect(d.hrZoneSecs).toEqual([]); // pas de streams
  });

  it("calcule le temps en zones et le découplage avec des streams", () => {
    const timeS = Array.from({ length: 40 }, (_, i) => i * 10); // 0..390s
    const hr = Array.from({ length: 40 }, (_, i) => (i < 20 ? 150 : 165));
    const speedMs = new Array(40).fill(3.6); // ~4:38/km
    const n: NormalizedActivity = {
      source: "FIT_IMPORT",
      externalId: "fit-1",
      sport: "RUN",
      startedAt: new Date("2026-06-13T09:04:00Z"),
      movingTimeS: 390,
      avgHr: 157,
      streams: { timeS, hr, speedMs },
    };
    const d = toActivityData(n, REFS);
    // HR 150 → Z2 ; 165 → Z3 : du temps dans chaque
    expect(d.hrZoneSecs[1]).toBeGreaterThan(0);
    expect(d.hrZoneSecs[2]).toBeGreaterThan(0);
    // pas de relative_effort → TRIMP calculé (>0)
    expect(d.trainingLoad).not.toBeNull();
    expect(d.trainingLoad!).toBeGreaterThan(0);
    // dérive cardiaque positive
    expect(d.decoupling).not.toBeNull();
    expect(d.decoupling!).toBeGreaterThan(0);
  });
});

describe("isLikelySame (dédup inter-sources)", () => {
  it("matche un même run FIT vs Strava", () => {
    const a = { startedAt: new Date("2026-06-13T09:04:00Z"), movingTimeS: 6906 };
    const b = { startedAt: new Date("2026-06-13T09:05:30Z"), movingTimeS: 6900 };
    expect(isLikelySame(a, b)).toBe(true);
  });
  it("ne matche pas deux runs distincts", () => {
    const a = { startedAt: new Date("2026-06-13T09:04:00Z"), movingTimeS: 6906 };
    const b = { startedAt: new Date("2026-06-14T09:04:00Z"), movingTimeS: 6906 };
    expect(isLikelySame(a, b)).toBe(false);
  });
});

describe("aggregate", () => {
  it("somme la charge par jour", () => {
    const acts = [
      { startedAt: new Date("2026-06-11T07:00:00Z"), trainingLoad: 30 },
      { startedAt: new Date("2026-06-11T18:00:00Z"), trainingLoad: 20 }, // 2 séances le même jour
      { startedAt: new Date("2026-06-13T09:00:00Z"), trainingLoad: 191 },
    ];
    const m = dailyLoadMap(acts);
    expect(m.get("2026-06-11")).toBe(50);
    expect(m.get("2026-06-13")).toBe(191);
  });

  it("produit une série CTL/ATL/TSB continue (jours de repos remplis)", () => {
    const acts = [
      { startedAt: new Date("2026-06-11T07:00:00Z"), trainingLoad: 50 },
      { startedAt: new Date("2026-06-13T09:00:00Z"), trainingLoad: 191 },
    ];
    const series = activitiesToFitness(acts);
    expect(series).toHaveLength(3); // 11, 12 (repos), 13
    expect(series[1].date).toBe("2026-06-12");
    expect(series.every((p) => typeof p.ctl === "number")).toBe(true);
  });
});
