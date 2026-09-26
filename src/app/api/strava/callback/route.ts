import { NextRequest, NextResponse } from "next/server";
import { saveTokens } from "@/lib/hub/strava";
import { checkToken } from "@/lib/hub/auth";

export const runtime = "nodejs";

/** Page de retour : Strava peut rouvrir Safari plutôt que l'app, on affiche donc un message au lieu de rediriger. */
function page(ok: boolean, msg: string) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kida · Strava</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f2;font-family:-apple-system,system-ui,sans-serif;color:#0f1012;padding:24px}
.c{max-width:340px;text-align:center;background:#fff;border-radius:28px;padding:32px 24px}.i{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:30px;background:${ok ? "#cdeabb" : "#ffd9cf"}}
h1{font-size:22px;margin:0 0 8px}p{color:#55585f;margin:0 0 20px;line-height:1.4}a{display:inline-block;background:#0f1012;color:#fff;text-decoration:none;padding:12px 22px;border-radius:99px;font-weight:600}</style></head>
<body><div class="c"><div class="i">${ok ? "✓" : "!"}</div><h1>${ok ? "Strava connecté" : "Strava non connecté"}</h1><p>${msg}</p><a href="/?strava=${ok ? "ok" : "erreur"}">Ouvrir Kida</a></div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (!(await checkToken(q.get("state")))) return page(false, "Lien expiré. Relance « Connecter Strava » depuis l'app.");
  const code = q.get("code");
  if (!code || q.get("error")) return page(false, "Autorisation refusée sur Strava.");
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" }),
  });
  if (!r.ok) return page(false, "Strava a refusé l'échange. Vérifie STRAVA_CLIENT_ID / SECRET sur Vercel.");
  await saveTokens(await r.json());
  return page(true, "C'est bon ! Tu peux fermer cette page et retourner dans l'app Kida.");
}
