/**
 * Score Tempo : 5 dimensions sur 100 + note globale pondérée.
 *
 * IMPORTANT : ce sont des heuristiques CALIBRABLES (pas une vérité scientifique).
 * Tout est déterministe, borné [0,100], et on stocke les inputs pour pouvoir
 * auditer/réviser. Le LLM ne calcule jamais ça.
 *
 * Pondération globale : Endurance 30 % · Résistance 15 % · Vitesse 15 %
 *                       · Récupération 20 % · Régularité 20 %
 */

export interface ScoreInputs {
  // Forme / fraîcheur
  ctl: number;
  tsb: number;
  // Endurance
  longestRunKm30d: number;
  avgDecoupling30d: number | null; // % (plus bas = meilleure durabilité)
  // Résistance
  thresholdMin30d: number; // minutes en Z3–Z4 sur 30 j
  // Vitesse
  z5Min30d: number; // minutes en Z5 sur 30 j
  bestPaceSecPerKm30d: number | null;
  thresholdPaceSecPerKm: number;
  // Récupération
  hrv: number | null;
  hrvBaseline: number | null;
  restHr: number | null;
  restHrBaseline: number | null;
  // Régularité
  activeDays28: number;
  weeklyVolumeCv: number | null; // coefficient de variation du volume hebdo
}

export interface ScoreResult {
  overall: number;
  endurance: number;
  resistance: number;
  speed: number;
  recovery: number;
  regularity: number;
  components: Record<string, number>; // détail pour audit/affichage
}

const WEIGHTS = { endurance: 0.3, resistance: 0.15, speed: 0.15, recovery: 0.2, regularity: 0.2 };

export function computeScore(i: ScoreInputs): ScoreResult {
  // ── Endurance ──────────────────────────────────────────────────────────
  const ctlComp = saturate(i.ctl, 60); // CTL ~100 → ~81
  const durabComp =
    i.avgDecoupling30d == null ? 60 : clamp(100 - (i.avgDecoupling30d - 2) * 10, 0, 100);
  const longRunComp = clamp((i.longestRunKm30d / 32) * 100, 0, 100);
  const endurance = round(0.6 * ctlComp + 0.25 * durabComp + 0.15 * longRunComp);

  // ── Résistance ─────────────────────────────────────────────────────────
  const thresholdComp = clamp((i.thresholdMin30d / 240) * 100, 0, 100);
  const resistance = round(0.7 * thresholdComp + 0.3 * ctlComp);

  // ── Vitesse ────────────────────────────────────────────────────────────
  const z5Comp = clamp((i.z5Min30d / 30) * 100, 0, 100);
  const paceComp =
    i.bestPaceSecPerKm30d == null
      ? 50
      : clamp(50 + (i.thresholdPaceSecPerKm - i.bestPaceSecPerKm30d) * 1.5, 0, 100);
  const speed = round(0.5 * z5Comp + 0.5 * paceComp);

  // ── Récupération ─────────────────────────────────────────────────────────
  const tsbComp = clamp(50 + i.tsb * 2.5, 0, 100); // TSB +20 → 100, -20 → 0
  const hrvComp =
    i.hrv != null && i.hrvBaseline ? clamp(50 + ((i.hrv - i.hrvBaseline) / i.hrvBaseline) * 250, 0, 100) : null;
  const restHrComp =
    i.restHr != null && i.restHrBaseline ? clamp(50 + (i.restHrBaseline - i.restHr) * 5, 0, 100) : null;
  const recoveryParts = [tsbComp, hrvComp, restHrComp].filter((x): x is number => x != null);
  const recovery = round(recoveryParts.reduce((a, b) => a + b, 0) / recoveryParts.length);

  // ── Régularité ─────────────────────────────────────────────────────────
  const freqComp = clamp((i.activeDays28 / 24) * 100, 0, 100); // ~6 j/sem = 100
  const consistencyComp =
    i.weeklyVolumeCv == null ? 60 : clamp(100 - (i.weeklyVolumeCv - 0.15) * 222, 0, 100);
  const regularity = round(0.6 * freqComp + 0.4 * consistencyComp);

  const overall = round(
    WEIGHTS.endurance * endurance +
      WEIGHTS.resistance * resistance +
      WEIGHTS.speed * speed +
      WEIGHTS.recovery * recovery +
      WEIGHTS.regularity * regularity
  );

  return {
    overall,
    endurance,
    resistance,
    speed,
    recovery,
    regularity,
    components: {
      ctlComp: round(ctlComp),
      durabComp: round(durabComp),
      longRunComp: round(longRunComp),
      thresholdComp: round(thresholdComp),
      z5Comp: round(z5Comp),
      paceComp: round(paceComp),
      tsbComp: round(tsbComp),
      freqComp: round(freqComp),
      consistencyComp: round(consistencyComp),
    },
  };
}

// Courbe saturante : 100 * (1 - e^(-x/k))
function saturate(x: number, k: number): number {
  return clamp(100 * (1 - Math.exp(-Math.max(0, x) / k)), 0, 100);
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
