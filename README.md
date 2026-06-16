# Tempo — starter (mode solo)

Coach d'endurance IA personnel, branché sur tes données. **Conçu pour un seul athlète : toi.**
Stack : Next.js 15 · TypeScript · Prisma/PostgreSQL · OpenAI GPT‑5.5 · MCP GetFast.

> « Tempo » est un nom de code provisoire.

## Ton profil (pré-rempli depuis Strava, le 16/06/2026)

- **Objectif** : Ultra Marin — *l'Avor*, **60 km**, **27 juin 2026** (≈ J−11). Terrain côtier roulant.
- **PB semi** : 1h25 → allure seuil ≈ **3:56/km** (236 s/km).
- **Zones FC** (bpm) : Z1 ≤125 · Z2 126–156 · Z3 157–172 · Z4 173–187 · Z5 ≥188 (max ≈ 196).
- **Volume** : tu cours quasi tous les jours (rythme soutenu, contexte régimentaire), ~50–70 km/sem.
- **À surveiller** : gêne récente à l'ischio droit (gérée avec ton ostéo) → garde-fou intégré au coach.
- **Phase actuelle** : affûtage (dernier long de 24 km le 13/06).

Tout ça est dans `prisma/seed.ts` — ajuste `restHr` (à mesurer) et `targetTimeS` (à définir).

## Démarrage

```bash
pnpm install          # ou npm install
cp .env.example .env  # remplis DATABASE_URL + OPENAI_API_KEY
pnpm db:push          # crée les tables
pnpm db:seed          # injecte ton profil + ton objectif
pnpm test             # valide le moteur de métriques
pnpm dev              # lance l'app
```

## Ce qui est déjà là

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | Modèle de données solo (profil, activités, métriques, objectif, plan, coach, score). |
| `prisma/seed.ts` | Tes vraies données (zones, objectif Ultra Marin). |
| `src/lib/metrics.ts` | **Le cerveau chiffré** : charge, CTL/ATL/TSB, zones (tes bornes), découplage. |
| `src/lib/metrics.test.ts` | Tests unitaires — *on valide avant de faire confiance aux chiffres*. |
| `src/lib/coach/system-prompt.ts` | Coach **garde-fous** : n'invente aucun chiffre, plafonne la charge, non médical, conscient de l'ischio. |
| `src/lib/coach/athlete-context.ts` | Le *grounding* : profil vivant envoyé au coach (métriques calculées, pas de brut). |
| `src/app/api/coach/route.ts` | Endpoint coach → GPT‑5.5 avec contexte + vérif post-réponse. |
| `src/lib/ingest/fit.ts` | Parseur FIT → activité normalisée (tes fichiers, voie sans API). |
| `src/lib/ingest/normalize.ts` | Forme pivot + mapper qui calcule charge/zones/découplage. |
| `src/lib/ingest/aggregate.ts` | Agrégation pure par jour → CTL/ATL/TSB (testée). |
| `src/lib/ingest/daily.ts` | Recalcul + upsert des `DailyMetric`. |
| `src/lib/ingest/sync.ts` | Orchestrateur : upsert activité, sync Strava, recalcul forme. |
| `src/lib/mcp/getfast.ts` | Client MCP GetFast (lit Strava côté serveur, voie conforme). |
| `src/app/api/import/fit/route.ts` | Upload d'un `.fit` → ingestion. |
| `src/app/api/sync/route.ts` | Déclenche une sync Strava via MCP (aussi appelable en cron). |
| `src/lib/score/score.ts` | **Score 0‑100** (5 dimensions + global pondéré), pur et auditable. |
| `src/lib/score/inputs.ts` | Assemble les signaux du score depuis la base. |
| `src/lib/jobs/daily.ts` | Tâche quotidienne : forme + score + readiness. |
| `src/app/api/cron/daily/route.ts` | Cron Vercel (protégé `CRON_SECRET`). |
| `src/app/api/score/route.ts` | Dernier score, ou recalcul à la volée (`?fresh=1`). |
| `vercel.json` | Planifie le cron quotidien (04:00). |
| `src/app/globals.css` | Design system (tokens encre + double accent + zones FC) porté de la maquette. |
| `src/app/layout.tsx` + `src/components/BottomNav.tsx` | Shell mobile + nav à 6 onglets. |
| `src/app/page.tsx` | **Accueil** : readiness (anneau), CTL/ATL/TSB, objectif, dernière activité. |
| `src/app/objectif/page.tsx` | **Objectif** : course cible, J−X, « prêt pour la course ? ». |
| `src/app/coach/page.tsx` | **Coach** : chat branché sur `POST /api/coach`. |
| `src/app/activites/page.tsx` | **Activités** : historique + répartition par zone + découplage. |
| `src/app/score/page.tsx` | **Score** : note globale + radar + 5 dimensions. |
| `src/app/plan/page.tsx` | **Plan** : état vide invitant à générer (prochaine brique). |
| `src/components/{ReadinessRing,Radar,ZoneBar}.tsx` | Composants signature (SVG). |
| `src/lib/plan/{schema,prompt,generate,safety}.ts` | **Génération de plan** GPT‑5.5 (sortie JSON validée + garde-fous volume/affûtage). |
| `src/lib/plan/safety.test.ts` | Tests des garde-fous de plan. |
| `src/app/api/plan/generate/route.ts` | `POST` → génère et enregistre le plan. |
| `src/components/PlanActions.tsx` + `src/app/plan/page.tsx` | UI : génère/affiche le plan (semaines + séances). |
| `src/lib/seed.ts` + `src/app/api/admin/seed/route.ts` | Seed partagé + route d'init **sans terminal** (téléphone). |

## Conformité (rappel)

L'IA + Strava passe **par le MCP** (GetFast / MCP Strava officiel), jamais `API Strava → contexte GPT`.
Le coach ici ne voit que des **métriques dérivées**, pas le brut API. Le brut Strava reste pour l'affichage.

## Prochaines briques (par ordre utile)

1. ✅ **Ingestion** — parseur FIT + client MCP GetFast + recalcul CTL/ATL/TSB (fait).
   - FIT : `POST /api/import/fit` (multipart, champ `file`).
   - Strava via MCP : `POST /api/sync` (renseigne `GETFAST_TOKEN` dans `.env`).
2. ✅ **Recalcul quotidien + Score 0‑100** (fait) : `runDailyJob` (cron `vercel.json`, 04:00)
   reconstruit la forme, calcule le score et la readiness du jour.
   - Pondération : Endurance 30 % · Résistance 15 % · Vitesse 15 % · Récupération 20 % · Régularité 20 %.
   - Lecture : `GET /api/score` (dernier) ou `GET /api/score?fresh=1` (recalcul à la volée).
   - ⚠️ Ce sont des heuristiques **calibrables** (inputs stockés dans `ScoreSnapshot.inputsJson` pour audit).
3. ✅ **Génération de plan** (fait) : `POST /api/plan/generate` → GPT‑5.5 produit des semaines/séances
   structurées calées sur ta forme, **bornées** (+10 %/sem max) avec **affûtage** forcé avant la course.
   Générable depuis l'onglet Plan. (Push *parcours* Garmin possible via GetFast `course_push_to_garmin` ;
   le push de *séances structurées* dépend de la Training API → étape ultérieure.)
4. ✅ **UI** (fait) : front Next.js sur les 6 écrans, branché aux endpoints.

**→ Le MVP est complet.** Reste surtout du raffinage : push Garmin des séances, notifications,
calibration du score sur tes vraies données, et l'auth solo (passcode).

## 📱 Tu es sur iPhone — pas de machine
Tu ne peux pas lancer `pnpm dev` en local sur le téléphone. Suis **`DEPLOY-PHONE.md`** :
GitHub + Vercel + Neon, édition via **GitHub Codespaces** (terminal cloud dans Safari), et init des
données via les routes (`/api/admin/seed`, `/api/import/fit`, `/api/cron/daily`) — tout sans PC.

### Pour développer (en Codespace)
`pnpm install && pnpm dev` (ou `pnpm test`) tournent dans le Codespace, pas sur ton iPhone.
