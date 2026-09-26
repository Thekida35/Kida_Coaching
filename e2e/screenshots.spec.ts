import { execFileSync } from "node:child_process";
import { test } from "@playwright/test";
import { demoActivities, demoChat, demoGear, demoInbox, demoMe, demoRaces, demoWeather } from "./demo";
import { login, makeState, mockApp } from "./mock";

/**
 * Captures du README avec des données fictives : SHOTS=1 npm run screenshots
 * (ignoré par les tests normaux). Images écrites dans docs/screens/.
 */
test.skip(!process.env.SHOTS, "captures seulement avec SHOTS=1");
test.use({ deviceScaleFactor: 2 });

const shot = (name: string) => `docs/screens/${name}.png`;

test("captures du README", async ({ page }) => {
  const s = makeState();
  Object.assign(s, { races: demoRaces, me: demoMe, chat: demoChat, inbox: demoInbox, unseen: 1, weather: demoWeather(), activities: demoActivities, gear: demoGear });
  s.prefs.briefTime = "06:45";
  await mockApp(page, s);
  // Vraie police Urbanist (téléchargée avec curl, qui passe par le proxy éventuel) pour des captures fidèles.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => {
    const css = r.request().url().includes("googleapis");
    const body = execFileSync("curl", ["-sfL", "-m", "20", "-A", "Mozilla/5.0 Chrome/120", r.request().url()]);
    return r.fulfill({ body, contentType: css ? "text/css" : r.request().url().endsWith(".ttf") ? "font/ttf" : "font/woff2" });
  });
  await login(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot("accueil") });

  await page.goto("/?v=races");
  await page.waitForTimeout(600);
  await page.click('[data-race="foulees-du-port"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot("course") });

  await page.goto("/?v=forme");
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot("forme") });

  await page.goto("/?v=coach");
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector(".chat")?.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("coach") });

  await page.goto("/");
  await page.waitForTimeout(800);
  await page.click("#bell");
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot("notifications") });
});
