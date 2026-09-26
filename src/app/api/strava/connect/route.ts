import { NextRequest, NextResponse } from "next/server";
import { stravaConfigured } from "@/lib/hub/strava";

export async function GET(req: NextRequest) {
  if (!stravaConfigured()) return NextResponse.redirect(new URL("/?strava=config", req.url));
  const u = new URL("https://www.strava.com/oauth/mobile/authorize");
  u.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  u.searchParams.set("redirect_uri", new URL("/api/strava/callback", req.url).toString());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "read,activity:read_all,profile:read_all");
  return NextResponse.redirect(u);
}
