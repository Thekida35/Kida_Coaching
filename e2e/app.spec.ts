import { expect, test } from "@playwright/test";
import { login, makeState, mockApp, type State } from "./mock";

let s: State;
const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  s = makeState();
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await mockApp(page, s);
});
test.afterEach(() => expect(errors, "erreurs JavaScript").toEqual([]));

test("connexion : mauvais code refusé, bon code accepté", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  s.code = "9999";
  for (const d of "1234") await page.click(`.pad button:text-is("${d}")`);
  await page.click("text=Valider");
  await expect(page).toHaveURL(/\/login$/);
  s.code = "4321";
  await login(page);
  await expect(page.getByText("Aujourd'hui")).toBeVisible();
});

test("accueil et onglets", async ({ page }) => {
  await login(page);
  await expect(page.getByText(/J−8 · Tout Rennes Court/).first()).toBeVisible();
  await page.goto("/?v=races");
  await expect(page.getByText("Mes courses").first()).toBeVisible();
  await page.goto("/?v=forme");
  await expect(page.getByText("Ma forme").first()).toBeVisible();
});

test("coach : réponse mise en forme et conversation gardée", async ({ page }) => {
  await login(page);
  await page.goto("/?v=coach");
  await expect(page.getByText("Ton coach")).toBeVisible();
  await page.fill("#cq", "Comment était ma séance ?");
  await page.click("#cform button");
  await expect(page.locator(".msg.u")).toHaveText("Comment était ma séance ?");
  await expect(page.locator(".msg.bot table")).toBeVisible();
  await expect(page.locator(".msg.bot b").first()).toHaveText("Verdict :");
  await page.reload();
  await page.goto("/?v=coach");
  await expect(page.locator(".msg.bot li")).toHaveText("Garde ce rythme");
});

test("cloche : point rouge, lecture, suppression", async ({ page }) => {
  await login(page);
  await expect(page.locator("#bell.has")).toBeVisible();
  await page.click("#bell");
  await expect(page.getByText("📊 Analyse prête · Footing")).toBeVisible();
  await expect(page.locator("#bell.has")).toHaveCount(0);
  await page.locator("[data-del]").first().click();
  await expect(page.getByText("📊 Analyse prête · Footing")).toHaveCount(0);
  expect(s.inbox).toHaveLength(1);
});

test("réglages : couper l'analyse des sorties", async ({ page }) => {
  await login(page);
  await page.click("#me");
  await expect(page.getByText("Analyse de mes sorties")).toBeVisible();
  await page.locator("#na").uncheck({ force: true });
  await expect.poll(() => s.prefs.notify.analyse).toBe(false);
});
