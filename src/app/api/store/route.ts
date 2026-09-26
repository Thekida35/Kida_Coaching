import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { readStore } from "@/lib/hub/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Données du hub. ETag : l'app interroge toutes les minutes, un 304 évite de renvoyer tout le contenu. */
export async function GET(req: NextRequest) {
  const body = JSON.stringify(await readStore());
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
