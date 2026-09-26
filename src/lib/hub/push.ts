import webpush from "web-push";
import { prisma } from "@/lib/hub/db";

export function pushReady() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Envoie une notification à tous les appareils abonnés ; retire ceux qui ont expiré. */
export async function sendAll(payload: { title: string; body: string; url?: string }) {
  if (!pushReady()) return { sent: 0, reason: "vapid_missing" };
  webpush.setVapidDetails("mailto:kida@kida-coaching.app", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
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
