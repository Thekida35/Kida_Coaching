import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { seedKillian } from "@/lib/seed";

const prisma = new PrismaClient();
export const runtime = "nodejs";

/**
 * POST /api/admin/seed   (en-tête: Authorization: Bearer <ADMIN_SECRET>)
 * Permet d'initialiser le profil sans terminal — pratique depuis le téléphone.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const me = await seedKillian(prisma);
    return NextResponse.json({ ok: true, athlete: me.firstName });
  } catch (err) {
    console.error("[/api/admin/seed]", err);
    return NextResponse.json({ error: "seed_failed" }, { status: 500 });
  }
}
