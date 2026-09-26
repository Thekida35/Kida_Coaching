import { NextRequest, NextResponse } from "next/server";
import { saveTokens } from "@/lib/hub/strava";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?strava=refus", req.url));
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" }),
  });
  if (!r.ok) return NextResponse.redirect(new URL("/?strava=erreur", req.url));
  await saveTokens(await r.json());
  return NextResponse.redirect(new URL("/?strava=ok", req.url));
}
