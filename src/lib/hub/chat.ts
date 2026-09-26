import { kvGet, kvSet } from "@/lib/hub/db";

export type ChatMsg = { role: "user" | "assistant"; content: string; t: number };

const KEY = "coach_chat";
const KEEP = 200; // messages conservés
export const CONTEXT_TURNS = 24; // messages envoyés au modèle

export async function loadChat(): Promise<ChatMsg[]> {
  return (await kvGet<ChatMsg[]>(KEY)) ?? [];
}
export async function saveChat(msgs: ChatMsg[]) {
  await kvSet(KEY, msgs.slice(-KEEP));
}
