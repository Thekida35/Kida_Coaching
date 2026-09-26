import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, deepMerge, validPath, ensureSeed } from "@/lib/hub/db";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ coll: string; id: string }> };
type Json = Record<string, unknown>;

async function body(req: NextRequest): Promise<Json | null> {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object" || Array.isArray(b)) return null;
  if (JSON.stringify(b).length > 256 * 1024) return null;
  return b as Json;
}

/** Remplace le document (création comprise). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { coll, id } = await ctx.params;
  const data = await body(req);
  if (!validPath(coll, id) || !data) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
  delete data.id;
  await prisma.hubDoc.upsert({ where: { path: `${coll}/${id}` }, create: { path: `${coll}/${id}`, coll, data: data as Prisma.InputJsonValue }, update: { data: data as Prisma.InputJsonValue } });
  return NextResponse.json({ ok: true });
}

/** Fusionne dans un document existant. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { coll, id } = await ctx.params;
  const patch = await body(req);
  if (!validPath(coll, id) || !patch) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
  await ensureSeed();
  const cur = await prisma.hubDoc.findUnique({ where: { path: `${coll}/${id}` } });
  if (!cur) return NextResponse.json({ error: "invalid_argument" }, { status: 404 });
  delete patch.id;
  const data = deepMerge(cur.data as Json, patch);
  await prisma.hubDoc.update({ where: { path: cur.path }, data: { data: data as Prisma.InputJsonValue } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { coll, id } = await ctx.params;
  if (!validPath(coll, id)) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
  await prisma.hubDoc.deleteMany({ where: { path: `${coll}/${id}` } });
  return NextResponse.json({ ok: true });
}
