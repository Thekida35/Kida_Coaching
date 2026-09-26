# Kida — hub des courses

App personnelle installable (PWA) de Killian : ses courses, son plan, sa forme et un coach IA.

- **Interface** : `public/app.html` (squelette) + `public/app/*.js|css` (le hub) et `public/login.html` (code d'accès), servis par le middleware.
- **API** (`src/app/api`) : stockage des courses (`store`), Strava OAuth (`strava/*`), météo Open-Meteo (`weather`, `geocode`), coach (`coach/*`, `ai`), notifications push (`push/*`) et passage planifié (`cron/brief` : brief, veille, bilan, analyse auto des sorties Strava).
- **Données** : PostgreSQL via Prisma (`HubDoc`, `KV`, `PushSub`). Les autres tables du schéma viennent de l'ancienne version et sont gardées pour ne pas perdre de données.

## Variables d'environnement

Voir `.env.example` : `DATABASE_URL`, `APP_CODE`, `AUTH_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `APP_URL` (optionnel).

## Développement

```bash
npm install
npm run dev
npm test          # vitest (serveur)
npm run test:e2e  # Playwright (interface, API simulée)
```

Notes pour Claude et les futurs contributeurs : voir `CLAUDE.md`.
