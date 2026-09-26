import { NextRequest, NextResponse } from "next/server";
import { getPrefs, setPrefs } from "@/lib/hub/prefs";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getPrefs());
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  return NextResponse.json(await setPrefs(b));
}
