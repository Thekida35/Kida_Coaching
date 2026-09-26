import { NextRequest, NextResponse } from "next/server";
import { stravaConfigured } from "@/lib/hub/strava";
import { makeToken } from "@/lib/hub/auth";

export async function GET(req: NextRequest) {
  if (!stravaConfigured()) return NextResponse.redirect(new URL("/?strava=config", req.url));
  // Adresse fixe : elle doit correspondre au domaine de rappel déclaré sur strava.com/settings/api.
  const u = new URL("https://www.strava.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  u.searchParams.set("redirect_uri", `${process.env.APP_URL || "https://kida-coaching.vercel.app"}/api/strava/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  // Jeton signé 15 min : le retour Strava s'ouvre souvent dans Safari, sans le cookie de l'app.
  u.searchParams.set("state", await makeToken(15 / 1440));
  u.searchParams.set("scope", "read,activity:read_all,profile:read_all");
  return NextResponse.redirect(u);
}
