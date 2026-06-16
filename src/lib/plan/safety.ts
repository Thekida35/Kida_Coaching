/**
 * Garde-fous DÉTERMINISTES appliqués au plan généré par le LLM.
 * Le modèle propose la structure ; ces fonctions garantissent que le volume
 * ne grimpe pas dangereusement et qu'un affûtage est bien présent avant la course.
 */

/** Limite la hausse de volume d'une semaine à l'autre (défaut +10 % max). */
export function clampProgression(values: number[], maxRamp = 0.1): number[] {
  const out = [...values];
  for (let i = 1; i < out.length; i++) {
    if (out[i - 1] > 0) {
      const cap = out[i - 1] * (1 + maxRamp);
      if (out[i] > cap) out[i] = Math.round(cap);
    }
  }
  return out;
}

/**
 * Force un affûtage : la dernière semaine ≤ 55 % du pic, l'avant-dernière ≤ 75 %.
 * Ne fait que RÉDUIRE (jamais augmenter).
 */
export function enforceTaper(values: number[]): number[] {
  const out = [...values];
  const peak = Math.max(0, ...out);
  const n = out.length;
  if (n >= 1) out[n - 1] = Math.min(out[n - 1], Math.round(peak * 0.55));
  if (n >= 2) out[n - 2] = Math.min(out[n - 2], Math.round(peak * 0.75));
  return out;
}

/** Applique progression bornée puis affûtage. Renvoie les volumes ajustés. */
export function safeWeeklyKm(values: number[], maxRamp = 0.1): number[] {
  return enforceTaper(clampProgression(values, maxRamp));
}
