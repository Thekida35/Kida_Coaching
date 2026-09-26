import { kvGet, kvSet } from "@/lib/hub/db";
import { buildBilan, buildBrief, buildVeille, parisToday } from "@/lib/hub/brief";
import { getPrefs, type NotifyKind } from "@/lib/hub/prefs";
import { sendAll } from "@/lib/hub/push";

const min = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

/**
 * Appelé plusieurs fois par jour (cron) : envoie chaque notification une seule fois,
 * dès que son heure est passée. Le brief n'est plus envoyé 3 h après l'heure choisie.
 */
export async function runTick(now = new Date()) {
  const prefs = await getPrefs();
  const today = parisToday(now);
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const t = min(hm);
  const sent = (await kvGet<Partial<Record<NotifyKind, string>>>("notif_sent")) ?? {};
  const plan: [NotifyKind, number, number, () => Promise<{ title: string; body: string; url?: string } | null>][] = [
    ["brief", min(prefs.briefTime), min(prefs.briefTime) + 180, () => buildBrief()],
    ["veille", min("20:00"), min("23:30"), buildVeille],
    ["bilan", min("20:30"), min("23:30"), buildBilan],
  ];
  const done: Record<string, unknown> = {};
  for (const [kind, from, until, build] of plan) {
    if (!prefs.notify[kind] || sent[kind] === today || t < from || t > until) continue;
    sent[kind] = today; // marqué même sans contenu : on ne recalcule pas toute la soirée
    const n = await build();
    done[kind] = n ? await sendAll(n, kind) : "rien à envoyer";
  }
  await kvSet("notif_sent", sent);
  return { at: `${today} ${hm}`, done };
}
