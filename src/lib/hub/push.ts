import webpush from "web-push";
import { prisma } from "@/lib/hub/db";
import { addInbox } from "@/lib/hub/inbox";

/** Clés VAPID nettoyées : un copier-coller dans Vercel ajoute vite un espace, un retour ligne ou des guillemets. */
export function vapidKey(name: "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY") {
  return (process.env[name] ?? "").replace(/[^A-Za-z0-9_-]/g, "");
}

export function pushReady() {
  return !!(vapidKey("VAPID_PUBLIC_KEY") && vapidKey("VAPID_PRIVATE_KEY"));
}

/** Envoie une notification à tous les appareils abonnés (retire ceux qui ont expiré) et la range dans la boîte de la cloche. */
export async function sendAll(payload: { title: string; body: string; url?: string }, kind = "info") {
  await addInbox({ kind, title: payload.title, body: payload.body });
  if (!pushReady()) return { sent: 0, reason: "vapid_missing" };
  webpush.setVapidDetails("mailto:kida@kida-coaching.app", vapidKey("VAPID_PUBLIC_KEY"), vapidKey("VAPID_PRIVATE_KEY"));
  const subs = await prisma.pushSub.findMany();
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await prisma.pushSub.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
    }
  }));
  return { sent, total: subs.length };
}
