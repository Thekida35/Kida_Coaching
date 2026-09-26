import { NextResponse } from "next/server";
import { sendAll } from "@/lib/hub/push";
import { buildBrief } from "@/lib/hub/brief";

export const runtime = "nodejs";

export async function POST() {
  const b = await buildBrief(true);
  return NextResponse.json(await sendAll(b ?? { title: "Kida", body: "Les notifications fonctionnent." }));
}
