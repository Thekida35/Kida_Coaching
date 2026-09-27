# Kida — fiche mémoire du projet

App personnelle (PWA installée sur iPhone) de **Killian**, coureur (militaire, Saint-Aubin-du-Cormier).
Objectif du moment : **Tout Rennes Court 10 km, 4 oct. 2026, 12 h, SAS 1, visé 37:00**.
Prod : https://kida-coaching.vercel.app (Vercel, déploiement auto à chaque merge sur `main`).

## Façon de travailler avec Killian

- Toujours répondre **en français**, simplement : il n'est pas développeur.
- **Lui poser des questions à chaque fois** avant de trancher un choix de produit ou de design (consigne permanente).
- **Grouper les modifications** : une seule PR / mise en ligne par demande, pas une par petit changement.
- Design : pastel, arrondi, police Urbanist, sobre. Pas de bandeau ou d'élément ajouté « partout » quand il demande un seul écran.
- Secrets (clés, codes) : jamais dans le code ni dans la conversation ; ils vont dans Vercel (Settings → Environment Variables)
  ou dans les secrets GitHub. Ne jamais lire ni déchiffrer les valeurs des variables Vercel.

## Architecture

- **Next.js 15 (App Router) sans pages React** : l'interface est du HTML/JS statique dans `public/`,
  le serveur ne fait que l'API (`src/app/api`) et le contrôle d'accès (`src/middleware.ts`).
- **Accès** : code 4 à 6 chiffres (`public/login.html`, il faut appuyer sur « Valider ») → cookie signé `kida_s` (HMAC, `lib/hub/auth.ts`).
  Le code changé dans l'app (KV `app_code`, haché) prime sur la variable `APP_CODE`.
  Le middleware laisse passer sans cookie : login, manifeste, icônes, `sw.js`, `/api/cron/*`, `/api/strava/callback`.
- **Base** : PostgreSQL (Neon) via Prisma. Tables utiles : `HubDoc` (courses + profil « me »), `KV` (clé → JSON), `PushSub`.
  Les autres tables du schéma (ancienne app « Tempo ») sont **gardées exprès** : `prisma db push` tourne au build, les supprimer effacerait des données.
- **IA** : Gemini via le SDK OpenAI (`lib/ai.ts`, `GEMINI_API_KEY`, `GEMINI_MODEL`). `AI_BASE_URL` permet de brancher un faux serveur en test.

### Interface (`public/`)

`app.html` ne contient que le squelette ; le code est dans `public/app/`, chargé **dans cet ordre** (scripts classiques, variables globales partagées) :

| Fichier | Rôle |
|---|---|
| `app.css` | tous les styles |
| `shim.js` | `window.KidaAPI` (fetch + 401 → /login) et `window.claude` (db/mcp/sample) qui imite l'API des artifacts Claude d'origine |
| `core.js` | état `S`, utilitaires (`$`, `esc`, `toast`), `render()`/`go(vue)`, accueil, courses, fiche course, forme, météo |
| `coach.js` | chat du coach : historique serveur, streaming, rendu Markdown sûr (`md()` échappe tout d'abord) |
| `features.js` | VDOT, Strava, import, fiche générée, push, réglages (avatar), cloche |
| `boot.js` | écouteurs globaux, `bind()` des interactions, lien direct `/?v=coach|races|forme`, chargement des données |

**À chaque modification de `public/app/*`** : incrémenter `?v=N` dans `app.html` (tous les fichiers ensemble).
**À chaque modification de `public/sw.js` ou des icônes** : incrémenter `VERSION` dans `sw.js`.
Le service worker sert `/` et `/app/*` depuis le cache puis les met à jour en arrière-plan ; icônes et polices en cache d'abord.

### Serveur (`src/lib/hub/`)

- `coachContext.ts` : contexte complet du coach — profil `DEFAULT_NOTES` (tiré de son ancienne conversation Claude : blessures, physiologie, chaussures, habitudes) ou notes éditées (KV `coach_notes`), course en focus, courses passées, forme, **12 mois de Strava** (cache 20 min, KV `coach_strava`).
- `chat.ts` : conversation (KV `coach_chat`, 200 messages gardés, 24 envoyés au modèle).
- `notify.ts` → `runTick()` : appelé par `/api/cron/brief` (Vercel Cron 1×/jour + **GitHub Actions toutes les 30 min**, `.github/workflows/notify.yml`, secret `CRON_SECRET`, variable facultative `APP_URL`).
  Envoie une fois par jour chacun : brief (heure choisie, jusqu'à +3 h), veille de séance clé (20 h), bilan de course (20 h 30). Marqueurs dans KV `notif_sent`.
- `analyse.ts` : **coach proactif**, appelé à chaque `runTick` : nouvelle course à pied Strava (< 36 h, KV `analysed.lastId`) → détail + tours + km + météo Open-Meteo → analyse Gemini → rangée dans le chat + notification « 📊 Analyse prête » qui ouvre `/?v=coach`.
  Au tout premier passage il ne fait que noter la dernière sortie (pas d'analyse rétroactive).
- `files.ts` : **fichiers donnés au coach** (trombone du chat, `POST /api/coach/files`, nom dans l'en-tête `X-File-Name`, 4 Mo max,
  photos réduites côté app). Transformés une fois en fiche texte : images et PDF lus par Gemini **API native** (`generateContent`, `inline_data` ;
  la couche OpenAI ne prend pas les PDF ; `GEMINI_NATIVE_URL` pour un faux serveur), `.fit` (fit-file-parser), `.gpx/.tcx` (lecture maison),
  `.xlsx` (read-excel-file), csv/txt. Gardés pour toujours dans KV `coach_files` (40 max), relus avant chaque réponse (60 000 caractères, plus récents d'abord).
  Liste et suppression dans « Mes notes ».
- `prefs.ts` (KV `prefs`) : heure du brief et interrupteurs `brief | veille | bilan | analyse`.
- `push.ts` → `sendAll()` range aussi chaque notification dans la cloche (`inbox.ts`, KV `inbox`, `inbox_seen`).
- `strava.ts` : jetons OAuth (KV `strava`, rafraîchis automatiquement). Retour OAuth fixe sur `APP_URL` ou le domaine de prod ; « redirect_uri invalid » = mauvais `STRAVA_CLIENT_ID` (le bon est 282340) ou domaine non déclaré sur strava.com/settings/api.

## Tests

- `npm test` : vitest (`src/**/*.test.ts`), tout ce qui touche au réseau est simulé.
- `npm run test:e2e` : Playwright sur l'interface avec une **API simulée** (`e2e/mock.ts` sert `public/` et répond à `/api/*`) — pas besoin de serveur ni de base.
  Ajouter un cas dans `e2e/app.spec.ts` pour chaque nouvel écran ou bouton. En environnement Claude Code, Chromium est déjà dans `/opt/pw-browsers` (ne pas lancer `playwright install`).
- `npx tsc --noEmit` : le build Vercel vérifie les types (ESLint est désactivé).
- La CI GitHub (`.github/workflows/tests.yml`) lance les trois à chaque PR.
- `npm run screenshots` : regénère les captures du README (`docs/screens/`) avec les **données fictives** de `e2e/demo.ts`
  (coureur « Alex », courses inventées). Ne jamais y mettre les vraies données de Killian. À relancer quand un écran change.

### Essai complet en local (serveur + base)

```bash
# Postgres local sur 5433, faux modèle IA (serveur OpenAI-compatible) sur 5099
export DATABASE_URL=postgresql://postgres@localhost:5433/kida APP_CODE=4321 AUTH_SECRET=test-test-test-test \
  CRON_SECRET=cronsecret GEMINI_API_KEY=x AI_BASE_URL=http://localhost:5099/v1
npx prisma db push && npx next dev -p 3055
curl -H 'Authorization: Bearer cronsecret' localhost:3055/api/cron/brief   # un passage du planificateur
```

## Mise en ligne

Branche de travail → une PR → merge sur `main` → Vercel déploie (vérifier le déploiement « Ready »).
Rien d'autre à faire, sauf nouvelle variable d'environnement (à ajouter par Killian dans Vercel, puis redéployer).

## À garder en tête

- Heure d'été : le workflow GitHub couvre 5 h–23 h Paris en été ; après le 25 oct. (heure d'hiver), décaler le cron d'une heure (`*/30 4-22 * * *`).
- La clé intervals.icu collée dans une ancienne conversation doit être régénérée par Killian avant toute intégration.
