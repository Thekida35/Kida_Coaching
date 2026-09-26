import { PrismaClient, Prisma } from "@prisma/client";
import seed from "@/data/hub-seed.json";

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

type Json = Record<string, unknown>;

let seeded = false; // une fois vérifié, on ne recompte plus à chaque requête (instance chaude)

/** Au premier lancement, la base est remplie avec les données du hub. */
export async function ensureSeed() {
  if (seeded) return;
  const n = await prisma.hubDoc.count();
  seeded = n > 0;
  if (seeded) return;
  const s = seed as unknown as { races: Record<string, Json>; me: Json };
  const rows = [
    ...Object.entries(s.races).map(([id, data]) => ({ path: `races/${id}`, coll: "races", data: data as Prisma.InputJsonValue })),
    { path: "profile/me", coll: "profile", data: s.me as Prisma.InputJsonValue },
  ];
  await prisma.hubDoc.createMany({ data: rows, skipDuplicates: true });
  seeded = true;
}

export async function readStore() {
  await ensureSeed();
  const docs = await prisma.hubDoc.findMany();
  const races = docs.filter((d) => d.coll === "races").map((d) => ({ ...(d.data as Json), id: d.path.slice(6) }));
  const me = docs.find((d) => d.path === "profile/me")?.data ?? null;
  return { races, me };
}

/** Fusion récursive des objets (les tableaux sont remplacés), comme un update de document. */
export function deepMerge(base: Json, patch: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const b = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)) {
      out[k] = deepMerge(b as Json, v as Json);
    } else out[k] = v;
  }
  return out;
}

export function validPath(coll: string, id: string) {
  return /^(races|profile)$/.test(coll) && /^[A-Za-z0-9_.~:@+-]{1,120}$/.test(id);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const r = await prisma.kV.findUnique({ where: { key } });
  return (r?.value as T) ?? null;
}
export async function kvSet(key: string, value: unknown) {
  await prisma.kV.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
}
