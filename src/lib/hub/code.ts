import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { kvGet, kvSet } from "@/lib/hub/db";

type Stored = { salt: string; hash: string };
const hash = (salt: string, code: string) => createHash("sha256").update(`${salt}:${code}`).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const validCode = (c: unknown): c is string => typeof c === "string" && /^\d{4,6}$/.test(c);

/** Le code choisi dans l'app prime ; sinon celui de Vercel (APP_CODE). */
export async function checkCode(code: string) {
  const s = await kvGet<Stored>("app_code");
  if (s) return same(hash(s.salt, code), s.hash);
  const env = process.env.APP_CODE;
  if (!env) return null; // aucun code configuré
  return same(createHash("sha256").update(code).digest("hex"), createHash("sha256").update(env).digest("hex"));
}

export async function setCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  await kvSet("app_code", { salt, hash: hash(salt, code) });
}
