import { kvGet, kvSet } from "@/lib/hub/db";

export type NotifyKind = "brief" | "veille" | "bilan";
export type Prefs = { briefTime: string; notify: Record<NotifyKind, boolean> };

export const DEFAULT_PREFS: Prefs = { briefTime: "06:45", notify: { brief: true, veille: true, bilan: true } };

export async function getPrefs(): Promise<Prefs> {
  const p = await kvGet<Partial<Prefs>>("prefs");
  return { briefTime: p?.briefTime ?? DEFAULT_PREFS.briefTime, notify: { ...DEFAULT_PREFS.notify, ...p?.notify } };
}

/** Valide et enregistre une modification partielle. */
export async function setPrefs(patch: { briefTime?: unknown; notify?: Record<string, unknown> }) {
  const cur = await getPrefs();
  if (typeof patch.briefTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(patch.briefTime)) cur.briefTime = patch.briefTime;
  for (const k of Object.keys(DEFAULT_PREFS.notify) as NotifyKind[]) {
    if (typeof patch.notify?.[k] === "boolean") cur.notify[k] = patch.notify[k] as boolean;
  }
  await kvSet("prefs", cur);
  return cur;
}
