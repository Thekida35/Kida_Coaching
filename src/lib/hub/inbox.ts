import { kvGet, kvSet } from "@/lib/hub/db";

export type InboxItem = { id: string; t: number; kind: string; title: string; body: string };

const KEY = "inbox";

/** Garde les notifications envoyées pour les relire dans l'app (cloche). */
export async function addInbox(item: Omit<InboxItem, "id" | "t">) {
  const list = (await kvGet<InboxItem[]>(KEY)) ?? [];
  list.unshift({ ...item, id: Math.random().toString(36).slice(2, 10), t: Date.now() });
  await kvSet(KEY, list.slice(0, 50));
}

export async function getInbox() {
  const [items, seen] = await Promise.all([kvGet<InboxItem[]>(KEY), kvGet<number>("inbox_seen")]);
  const list = items ?? [];
  return { items: list, unseen: list.filter((i) => i.t > (seen ?? 0)).length };
}

export async function markInboxSeen() {
  await kvSet("inbox_seen", Date.now());
}

/** Supprime une notification, ou toutes si aucun id. */
export async function deleteInbox(id?: string) {
  const list = (await kvGet<InboxItem[]>(KEY)) ?? [];
  await kvSet(KEY, id ? list.filter((i) => i.id !== id) : []);
}
