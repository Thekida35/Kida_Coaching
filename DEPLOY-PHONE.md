# Déployer et développer depuis un iPhone (sans machine)

Tu n'as pas besoin d'ordinateur. Tout se fait dans le cloud, piloté depuis Safari.

## Les 3 services (tous avec tableau de bord mobile)
- **GitHub** — héberge le code.
- **Vercel** — build + hébergement, redéploie à chaque `git push`.
- **Neon** (ou Vercel Postgres) — base PostgreSQL managée.

## Pour coder/éditer depuis le téléphone
- **GitHub Codespaces** (recommandé) : un vrai environnement Linux dans le navigateur.
  Tu peux y lancer `pnpm install`, `pnpm test`, `prisma`, etc. depuis Safari. C'est ton « terminal ».
- ou **Working Copy** (app iOS Git) pour cloner/committer/pousser le projet.
- Édition rapide d'un fichier : ouvre le repo sur github.com et tape `.` → éditeur web.

## Mise en route (une fois)
1. **Code sur GitHub** : crée un repo, dépose le contenu de `tempo-starter/` (via Codespaces : glisse les fichiers ; ou Working Copy).
2. **Base** : crée une base sur Neon → copie l'`DATABASE_URL`.
3. **Vercel** : « Import Git Repository » → choisis le repo.
4. **Variables d'env** (Vercel → Settings → Environment Variables) :
   `DATABASE_URL`, `OPENAI_API_KEY`, `CRON_SECRET`, `ADMIN_SECRET`,
   `GETFAST_MCP_URL`, `GETFAST_TOKEN` (optionnel au début).
5. **Deploy** : Vercel build automatiquement. Le build lance `prisma generate && prisma db push`
   → tes tables sont créées toutes seules (pas de migration manuelle).

## Initialiser tes données (sans terminal)
Une fois déployé :
1. **Seed du profil** : envoie `POST https://<ton-app>/api/admin/seed`
   avec l'en-tête `Authorization: Bearer <ADMIN_SECRET>`.
   → depuis le téléphone : app **Raccourcis** (action « Obtenir le contenu d'une URL »),
   **Scriptable**, ou un client HTTP iOS. (Ou `curl` depuis Codespaces.)
2. **Importer des activités** : ouvre l'app → onglet **Activités** → importe un `.fit`
   (ou `POST /api/sync` si `GETFAST_TOKEN` est rempli).
3. **Calculer forme + score** : appelle `GET /api/cron/daily`
   (en-tête `Authorization: Bearer <CRON_SECRET>`), ou attends le cron de 04:00.
4. **Générer le plan** : onglet **Plan** → « Générer mon plan ».

## Boucle de dev au quotidien
Édite (Codespaces / Working Copy / github.dev) → commit → push → Vercel redéploie →
tu testes sur l'URL live depuis ton iPhone. Voilà ton cycle complet, sans PC.

> Note : `prisma db push` au build échoue s'il détecte une perte de données (changement de schéma
> destructif). Dans ce cas, lance `pnpm db:push` depuis un Codespace, ou ajoute `--accept-data-loss`
> volontairement (tes activités sont re-synchronisables).
