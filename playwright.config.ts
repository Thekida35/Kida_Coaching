import { defineConfig } from "@playwright/test";

/**
 * Tests de l'interface (public/app*) avec une API simulée : pas de serveur, pas de base.
 * Lancer : npm run test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 20_000,
  use: {
    baseURL: "http://kida.test",
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block", // le service worker court-circuiterait l'API simulée
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
});
