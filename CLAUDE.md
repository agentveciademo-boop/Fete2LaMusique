# Fête de la Musique — Paris 2026

Webapp PWA pour explorer les concerts de la Fête de la Musique du 21 juin à Paris (puis petite couronne).

## Objectif

Deux interfaces sur la même donnée :
- **Carte interactive** avec filtres (horaire, genre, plein air/salle, prix) — priorité MVP
- **Chatbot** en langage naturel ("je veux du jazz à 19h") — phase 2

## Architecture

Deux services indépendants, joints par un contrat d'API simple :

```
OpenAgenda API (UID 4641572, 2026)
        ↓  sync quotidienne → horaire en J-7
   Supabase (PostgreSQL + PostGIS)
        ↓  REST API
   Next.js PWA (Vercel)
```

Voir [docs/architecture.md](docs/architecture.md) pour le détail.

## Stack

- **Frontend** : Next.js 14+ (App Router, TS), Tailwind v4, shadcn/ui
- **Carte** : MapLibre GL JS + react-map-gl. Style primary Stamen Watercolor (Stadia), fallback OpenFreeMap Liberty (robustesse jour J, zéro clé)
- **Architecture données : JSON-first** (pas de DB pour le MVP — voir [docs/decisions-analysis.md](docs/decisions-analysis.md) B5)
  - L'ETL produit `public/data/events.json` commité dans le repo
  - Le frontend fait un seul `fetch('/data/events.json')` au mount, stocke dans Context React
  - Tout le filtrage est côté client via MapLibre
  - Zéro backend, zéro DB, zéro coût, zéro panne potentielle le 21 juin
- **ETL** : TypeScript standalone (Bun ou tsx) dans `etl/sync.ts`, déclenché par GitHub Actions cron qui commit le JSON
- **IA chatbot** (phase 2 uniquement) : Mistral Small 4. **Pas de Mistral dans l'ETL** — normalisation par mapping statique. Une DB sera ajoutée si/quand le chatbot v2 démarrera, modélisée pour ses vraies requêtes

## Pilotage des tâches — GitHub Project

**Project** : https://github.com/users/agentveciademo-boop/projects/1 (Sprint Fête de la Musique 2026)

**Règle absolue** : toute nouvelle tâche, idée ou bug **doit avoir une issue GitHub**. Une issue créée sur le repo `agentveciademo-boop/Fete2LaMusique` est ajoutée **automatiquement** au project (workflow Auto-add actif).

### Statuts disponibles

- **Backlog** — identifié mais pas encore prioritaire (Phase 2+ par défaut)
- **Todo** — à faire bientôt (cette semaine ou la suivante)
- **In Progress** — en cours (mis à jour auto quand une PR `Closes #N` est ouverte)
- **In Review** — PR ouverte, en review
- **Done** — terminé (mis à jour auto quand l'issue est fermée ou la PR mergée)

### Custom fields à remplir sur chaque issue

| Field | Valeurs | Quand le remplir |
|---|---|---|
| **Status** | Backlog → Done | À la création + auto via workflows PR |
| **Phase** | Setup / Phase 1 (S21) → Phase 5 (S25) | À la création, déduit du sprint |
| **Axe** | Setup / Dev / Data / Com TikTok / Com LinkedIn / Presse / Design | À la création |
| **Priorité** | 🔴 Critique / 🟠 Haute / 🟡 Moyenne / 🟢 Basse | À la création |
| **Date début** | Date | Quand on planifie de démarrer |
| **Date fin** | Date | Quand on prévoit de finir (apparaît dans la vue Roadmap) |

### Comment créer une tâche

**Depuis le terminal** :
```bash
gh issue create -R agentveciademo-boop/Fete2LaMusique \
  --title "Titre de la tâche" \
  --body "Description en markdown\n\n- [ ] Critère 1\n- [ ] Critère 2"
```
L'issue est auto-ajoutée au project en Status: Todo. Tu remplis Phase / Axe / Priorité / Dates dans le project.

**Depuis l'UI GitHub** : bouton "New issue" sur le repo OU bouton "Add item" dans le project. Si tu pars du project, tu peux remplir tous les fields direct sans passer par le repo.

### Vues du project

- **View 1 (Table)** — vue détaillée avec toutes les colonnes, pour éditer en masse
- **Kanban** — board groupé par Status, drag&drop pour faire avancer
- **Roadmap** — Gantt sur Date début → Date fin, vue temporelle du sprint

### Workflows auto actifs

1. Nouvelle issue/PR sur le repo → ajoutée au project en Status: Todo
2. PR ouverte avec `Closes #N` ou liée à une issue → Status passe en **In Progress**
3. PR mergée → Status passe en **Done**
4. Issue fermée manuellement → Status passe en **Done**
5. Sub-issues auto-ajoutées au project

### Quand traiter une issue

- Tu prends une carte en Status: **Todo** dans la priorité de ta phase
- Si dev, tu ouvres une PR avec `Closes #N` → la carte bascule en In Progress
- À la fin, tu mergeras → Done auto

## Déploiement & Workflow Git

**Repo** : https://github.com/agentveciademo-boop/Fete2LaMusique (compte commun `agent-vecia-demo`)

**Branches** :
- `prod` — default GitHub + branche de production sur Vercel
- `dev` — branche de preview, liée au sous-domaine `dev.fete2lamusique.paname.ai`

**Domaines live** :
- 🌐 Prod : https://fete2lamusique.paname.ai
- 🧪 Dev : https://dev.fete2lamusique.paname.ai (publique, pas de protection)

**Workflow** :
```bash
git push origin dev    # → deploy preview auto sur dev.fete2lamusique.paname.ai
git push origin prod   # → deploy prod auto sur fete2lamusique.paname.ai
```

Pour merger une feature de `dev` vers `prod`, faire un PR ou `git checkout prod && git merge dev && git push origin prod`.

**Stack hébergement** :
- **Vercel Hobby** : team `agentveciademo-2709's projects`, projet `fete2lamusique`. Accès via SSO Google sur le Gmail commun.
- **DNS** : Cloudflare (zone `paname.ai`). CNAME `fete2lamusique` et `dev.fete2lamusique` → `cname.vercel-dns.com`, **proxy DNS only** (gris, pas orange — sinon casse le SSL Vercel).
- **Deployment Protection** : désactivée. Les previews sont publiques, cohérent avec la stratégie "construire en public" du sprint.

## Timeline

- **21 juin 2026** : Fête de la Musique (deadline absolue)
- **21 mai 2026** : Date limite d'inscription des organisateurs sur OpenAgenda
- **15-20 juin 2026** : Données complètes sur l'API OpenAgenda

## Documentation

- [docs/architecture.md](docs/architecture.md) — Vue d'ensemble des deux services
- [docs/data-schema.md](docs/data-schema.md) — Schéma DB cible (provisionnel sur les genres)
- [docs/data-sources.md](docs/data-sources.md) — Recherche OpenAgenda + alternatives
- [docs/design-decisions.md](docs/design-decisions.md) — Décisions filtres et pourquoi
- [docs/arbitrated-points.md](docs/arbitrated-points.md) — Tous les points arbitrés, classés par coût de retour en arrière (🔴 / 🟡 / 🟢)
- [docs/decisions-analysis.md](docs/decisions-analysis.md) — Analyse critique point par point : alternatives, pros/cons, verdict
- [docs/prompts/frontend-mvp.md](docs/prompts/frontend-mvp.md) — Prompt MVP carte
- [docs/prompts/backend-etl.md](docs/prompts/backend-etl.md) — Prompt ETL (recherche techno + recon + ETL)

## État actuel (maj 2026-05-31)

MVP fonctionnel, déployé en continu sur `dev`. Données réelles branchées.

**Pages** (Next.js App Router) :
- `/` — page d'accueil (thème dark) avec boutons : App, Stratégie, Planning
- `/carte` — la carte interactive (le cœur)
- `/strategie` — page publique "La démarche" (build-in-public, sans info business interne)
- `/planning` — calendrier juin 2026 (à remplir)

**Données** : `etl/sync.ts` récupère l'agenda OpenAgenda 2026 (UID 4641572) → `public/data/events.json` (~182 concerts Paris). Clé API dans `etl/.env` (gitignored).
- ⚠️ **Champs OpenAgenda 2026 ≠ 2025** : genres = `styles` (et non `styles-musicaux`), texte libre = `autre-styles`. L'ETL gère les deux nomenclatures. Le `recon-report.md` porte sur 2025.
- Chaque event porte `source: 'openagenda'` + `source_url` (archi multi-sources prête : Instagram, Paris.fr, connaissance à venir).
- Calques transit : `etl/transit.ts` (lignes métro/RER) + `etl/stations.ts` (385 stations), open data IDFM, figés dans `public/data/`.

**Carte / filtres** (état "light" décidé le 31/05) :
- Axe horaire **continu** Sam 00h → Dim 24h (`toWeekendAxis`, 0–48). Plus d'onglet Sam/Dim : une seule carte.
- Filtres restants : **Genre** (pastilles sur la carte) + **Horaire** (slider). Supprimés : Prix, Plein air/salle, Sous-genres (données trop pauvres/trompeuses).
- Prix : tout `free` (la FdM est gratuite ; l'inférence regex produisait des faux "payant").
- Points de carte en **couleur unique** (corail) : la couleur n'encode plus le genre (souvent multiple).

**Gotchas maplibre-gl v5** : `getClusterExpansionZoom` renvoie une Promise (plus de callback) ; `queryRenderedFeatures({layers})` renvoie `[]` si UN layer listé n'existe pas (ne lister que les layers présents).

**Reste à faire** : cron GitHub Actions du sync (ajouter `OPENAGENDA_API_KEY` aux secrets du repo) ; remplir `/planning` et `/strategie` ; autres sources de données ; merge `dev` → `prod`.

## Contraintes importantes

- **PWA, pas natif** : déploiement rapide, installable iOS/Android via "Ajouter à l'écran d'accueil"
- **OpenAgenda gratuit** : compte gratuit, clé publique. Pas de paiement
- **Stadia Maps free tier** : 200k credits/mois, allowlister le domaine en prod
- **MVP carte d'abord** : le chatbot vient après, ne pas ralentir la carte pour ça

## Ce qu'on a explicitement écarté

- Filtre `size` (small/medium/large) : impossible à inférer fiablement depuis OpenAgenda
- Filtre `ambiance` à 4 valeurs : remplacé par `is_outdoor` (plein air / salle)
- MCP direct vers OpenAgenda : rate limits + latence + pas de normalisation
- App native : trop long avant le 21 juin, PWA suffit

Voir [docs/design-decisions.md](docs/design-decisions.md) pour le rationale complet.
