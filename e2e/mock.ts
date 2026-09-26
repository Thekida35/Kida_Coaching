import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "@playwright/test";

const PUB = join(__dirname, "..", "public");
const TYPES: Record<string, string> = { html: "text/html", js: "text/javascript", css: "text/css", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", webmanifest: "application/manifest+json" };

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/** État de la fausse API, modifiable par chaque test. */
export function makeState() {
  return {
    logged: false,
    code: "4321",
    races: [{ id: "trc", name: "Tout Rennes Court", date: day(8), time: "12:00", distanceKm: 10, dplus: 20, place: "Rennes", status: "upcoming", goal: { target: "37:00" } }] as Record<string, unknown>[],
    chat: [] as { role: string; content: string; t: number }[],
    inbox: [
      { id: "a1", t: Date.now() - 3600e3, kind: "analyse", title: "📊 Analyse prête · Footing", body: "Séance propre, FC basse." },
      { id: "b1", t: Date.now() - 86400e3, kind: "brief", title: "☀️ Brief", body: "Repos aujourd'hui." },
    ],
    unseen: 1,
    prefs: { briefTime: "06:45", notify: { brief: true, veille: true, bilan: true, analyse: true } },
    me: null as unknown,
    weather: null as unknown, // null → météo indisponible (503)
    activities: null as unknown[] | null, // null → Strava indisponible (503)
    gear: null as unknown[] | null,
    reply: "**Verdict :** bonne séance.\n\n| km | Allure |\n|---|---|\n| 1 | 3:40 |\n\n- Garde ce rythme",
  };
}
export type State = ReturnType<typeof makeState>;

const json = (r: Route, body: unknown, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const file = (r: Route, rel: string) => r.fulfill({ status: 200, contentType: TYPES[rel.split(".").pop()!] ?? "application/octet-stream", body: readFileSync(join(PUB, rel)) });

/** Sert public/ et simule /api/* comme le ferait le serveur Next (middleware compris). */
export async function mockApp(page: Page, s: State) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route("http://kida.test/**", async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const p = u.pathname;
    const m = req.method();
    if (p === "/login") return file(r, "login.html");
    if (p === "/api/login") {
      const ok = JSON.parse(req.postData() || "{}").code === s.code;
      s.logged = ok;
      return json(r, ok ? { ok: true } : { error: "bad_code" }, ok ? 200 : 401);
    }
    if (/^\/(icons\/|manifest|apple-touch)/.test(p)) return file(r, p.slice(1));
    if (!s.logged) return p.startsWith("/api/") ? json(r, { error: "auth" }, 401) : r.fulfill({ contentType: "text/html", body: '<script>location.replace("/login")</script>' }); // (une vraie redirection 302 échapperait à la simulation)
    if (p === "/") return file(r, "app.html");
    if (p.startsWith("/app/")) return file(r, p.slice(1));
    if (p === "/api/store") return json(r, { races: s.races, me: s.me });
    if (p === "/api/prefs") {
      if (m === "PUT") Object.assign(s.prefs.notify, JSON.parse(req.postData() || "{}").notify ?? {});
      return json(r, s.prefs);
    }
    if (p === "/api/inbox") {
      if (m === "DELETE") s.inbox = u.searchParams.get("id") ? s.inbox.filter((i) => i.id !== u.searchParams.get("id")) : [];
      if (m === "POST") s.unseen = 0;
      return json(r, { items: s.inbox, unseen: s.unseen });
    }
    if (p === "/api/coach/chat") {
      if (m === "GET") return json(r, { messages: s.chat });
      if (m === "DELETE") return (s.chat = []), json(r, { ok: true });
      const q = JSON.parse(req.postData() || "{}").message;
      s.chat.push({ role: "user", content: q, t: Date.now() }, { role: "assistant", content: s.reply, t: Date.now() });
      return r.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: s.reply });
    }
    if (p === "/api/strava/status") return json(r, { configured: true, connected: true, athlete: "Killian" });
    if (p === "/api/weather" && s.weather) return json(r, s.weather);
    if (p === "/api/strava/activities" && s.activities) return json(r, { activities: s.activities });
    if (p === "/api/strava/gear" && s.gear) return json(r, { gear: s.gear });
    if (p.startsWith("/api/strava/") || p === "/api/weather") return json(r, { error: "unavailable" }, 503);
    if (p === "/api/push/key") return json(r, { key: null });
    return json(r, { error: "not_found" }, 404);
  });
}

export async function login(page: Page, code = "4321") {
  await page.goto("/login");
  for (const d of code) await page.click(`.pad button:text-is("${d}")`);
  await page.click("text=Valider");
  await page.waitForURL("/");
}
