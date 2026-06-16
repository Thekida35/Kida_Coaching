import { describe, it, expect } from "vitest";
import {
  activityLoad,
  fitnessSeries,
  fillDailyLoads,
  hrZone,
  paceZone,
  timeInZones,
  decoupling,
} from "./metrics";

// Tes bornes réelles (Strava)
const HR_ZONES = [125, 156, 172, 187];
const PACE_ZONES = [305, 262, 236, 221, 207]; // s/km, Z1..Z5

describe("activityLoad", () => {
  it("préfère le relative_effort Strava quand il existe", () => {
    expect(activityLoad({ relativeEffort: 151, durationS: 3456, avgHr: 165 })).toBe(151);
  });

  it("retombe sur le TRIMP de Banister sans relative_effort", () => {
    // 60 min à FC moyenne 150, repos 45, max 196 → HRr ≈ 0.695
    const load = activityLoad({ durationS: 3600, avgHr: 150, restHr: 45, maxHr: 196 });
    expect(load).not.toBeNull();
    expect(load!).toBeGreaterThan(80);
    expect(load!).toBeLessThan(180);
  });

  it("renvoie null si on ne peut rien calculer", () => {
    expect(activityLoad({ durationS: 3600 })).toBeNull();
  });
});

describe("fitnessSeries (CTL/ATL/TSB)", () => {
  it("monte CTL/ATL avec une charge constante", () => {
    const days = Array.from({ length: 42 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      load: 100,
    }));
    const s = fitnessSeries(days);
    const last = s[s.length - 1];
    // ATL (7j) converge plus vite que CTL (42j) → ATL > CTL en charge constante
    expect(last.atl).toBeGreaterThan(last.ctl);
    expect(last.ctl).toBeGreaterThan(40); // ~ vers 100 asymptotiquement
  });

  it("TSB devient positif quand on réduit la charge (affûtage)", () => {
    const build = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      load: 120,
    }));
    const taper = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      load: 30,
    }));
    const s = fitnessSeries([...build, ...taper]);
    expect(s[s.length - 1].tsb).toBeGreaterThan(0);
  });
});

describe("fillDailyLoads", () => {
  it("insère les jours de repos à 0", () => {
    const filled = fillDailyLoads([
      { date: "2026-01-01", load: 80 },
      { date: "2026-01-04", load: 50 },
    ]);
    expect(filled).toHaveLength(4);
    expect(filled[1].load).toBe(0);
    expect(filled[2].load).toBe(0);
  });
});

describe("hrZone", () => {
  it("classe correctement aux bornes", () => {
    expect(hrZone(120, HR_ZONES)).toBe(1);
    expect(hrZone(125, HR_ZONES)).toBe(1);
    expect(hrZone(126, HR_ZONES)).toBe(2);
    expect(hrZone(172, HR_ZONES)).toBe(3);
    expect(hrZone(190, HR_ZONES)).toBe(5);
  });
});

describe("paceZone", () => {
  it("plus on est rapide, plus la zone est haute", () => {
    // 3:30/km = 210 s/km → vitesse 4.76 m/s → Z5
    expect(paceZone(1000 / 210, PACE_ZONES)).toBe(5);
    // 6:00/km = 360 s/km → vitesse 2.78 m/s → Z1
    expect(paceZone(1000 / 360, PACE_ZONES)).toBe(1);
    // allure seuil 3:56/km = 236 s/km → borne Z3
    expect(paceZone(1000 / 236, PACE_ZONES)).toBe(3);
  });
});

describe("timeInZones", () => {
  it("additionne le temps par zone", () => {
    const t = [0, 10, 20, 30];
    const hr = [120, 120, 160, 160]; // Z1, Z1, Z3, Z3
    const secs = timeInZones(t, hr, (v) => hrZone(v, HR_ZONES), 5);
    expect(secs[0]).toBe(10); // intervalle 0→10 : FC 120 → Z1
    expect(secs[2]).toBe(20); // intervalles 10→30 : FC 160 → Z3
  });
});

describe("decoupling", () => {
  it("détecte une dérive cardiaque positive", () => {
    const n = 40;
    const speed = new Array(n).fill(3.5);
    // FC qui dérive vers le haut en 2e moitié → ratio vitesse/FC baisse
    const hr = Array.from({ length: n }, (_, i) => (i < n / 2 ? 150 : 165));
    const d = decoupling(speed, hr);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(0);
  });
});
