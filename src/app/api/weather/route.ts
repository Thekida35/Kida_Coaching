import { NextRequest, NextResponse } from "next/server";
import { forecast, parseKey } from "@/lib/hub/weather";

export async function GET(req: NextRequest) {
  const k = parseKey(req.nextUrl.searchParams.get("key"));
  if (!k) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    return NextResponse.json(await forecast(k.lat, k.lon));
  } catch {
    return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  }
}
