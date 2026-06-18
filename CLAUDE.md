# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Fête de la Musique — Paris 2026

Webapp PWA pour explorer les concerts de la Fête de la Musique du 21 juin à Paris (puis petite couronne).

## Objectif

Deux interfaces sur la même donnée :
- **Carte interactive** avec filtres (tranche horaire, genre, arrondissement) — priorité MVP, c'est le cœur
- **Chatbot** en langage naturel ("je veux du jazz à 19h") — phase 2, pas encore branché

## Commandes

```bash
npm run dev          # serveur de dev Next (http://localhost:3000)
npm run build        # ⚠️ lance d'abord les tests (TZ=UTC vitest run) PUIS next build
npm test             # tests : TZ=UTC vitest run  (le TZ=UTC est volontaire, voir Timezone)
npm run test:watch   # vitest en watch
npm start            # serveur prod après build

# ETL (régénère public/data/events.json)
npm run sync                                   # toutes les sources
SOURCES=openagenda npm run sync                # une seule source (openagenda | qfap | manuel)
SOURCE_AGENDA_UID=7476421 npm run sync         # OpenAgenda archive 2025 (dev/recon)
npm run recon                                  # exploration d'un agenda OpenAgenda (recon.ts)

# Calques statiques (open data, à régénérer ~jamais — figés dans public/data/*.json)
npx tsx etl/periph.ts                          # tracé du périph (OSM relation 1159709)
npx tsx etl/transit.ts                         # lignes métro/RER (idem stations/fontaines/toilettes)
```

- **Lancer un seul test** : `TZ=UTC npx vitest run src/lib/time.test.ts` (ou `-t "nom du test"`). Toujours préfixer `TZ=UTC` — les tests dépendent du fuseau (voir plus bas).
- `npm run build` **inclut les tests** : un test rouge casse le build (et donc le déploiement Vercel).
- L'ETL tourne sous `tsx`/`bun`. Clés/config dans `etl/.env` (gitignored) : `OPENAGENDA_API_KEY`, `SOURCE_AGENDA_UID`.

## Architecture du code (orientation rapide)

**JSON-first, aucune DB.** Tout passe par un fichier statique commité dans le repo. Zéro backend, zéro coût, zéro panne possible le jour J.

```
Sources (etl/sources/*.ts)            Frontend (Next App Router)
  openagenda · qfap · manuel            fetch('/data/events.json') au mount
        │                                       │ (useEvents → Context React)
        ▼                                       ▼
  etl/sync.ts  ──►  public/data/events.json  ──►  filtrage 100% client (MapLibre)
  (dedup + normalize + enrichments)         layers statiques : transit/stations/
        │ commit git → redeploy Vercel       fontaines/toilettes/arrondissements.json
```

### Pipeline ETL (`etl/`)
- `sync.ts` est l'**orchestrateur** : il appelle chaque source, fusionne/dédoublonne (`lib/dedup.ts`), normalise les genres (`lib/normalize.ts`), applique `enrichments.json` (instagram/tiktok manuels), trie par `start_time` (diffs git minimaux) et écrit `public/data/events.json`.
- **Ajouter une source** = créer `etl/sources/<nom>.ts` exportant `fetch<Nom>(): Promise<OutEvent[]>`, puis l'enregistrer dans `ALL_SOURCES` de `sync.ts`. Chaque event porte `source` (`openagenda` | `qfap` | `both` | `manuel`) et `source_url`, affichés dans la fiche.
- ⚠️ **Champs OpenAgenda 2026 ≠ 2025** : genres = `styles` (pas `styles-musicaux`), texte libre = `autre-styles`. L'ETL gère les deux nomenclatures.
- Les **calques carte** (métro/RER, 385 stations, fontaines à boire, toilettes, contours d'arrondissements, tracé du périph) sont générés par `etl/transit.ts`, `stations.ts`, `fontaines.ts`, `toilettes.ts`, `periph.ts` et figés dans `public/data/*.json` (open data IDFM / Paris / OSM). Pour ajouter un concert à la main : `etl/manual-events.json` (cf. `etl/AJOUTER-UN-CONCERT.md`).
- ⚠️ **`popularity` (0–100) est curé à la main dans `public/data/events.json`**, PAS recalculé par l'ETL. C'est la notoriété de l'artiste (recherche web inversée), utilisée par la heatmap de l'onglet Affluence. Conséquence : les events `source: 'presse'` (têtes d'affiche ajoutées à la main) et les scores ajustés **vivent uniquement dans events.json** — un `npm run sync` les écrase/réinitialise. Avant un resync « propre », sauvegarder ou rebasculer ces ajouts dans une source. (Un fichier d'overrides appliqué par l'ETL reste à faire si on veut rendre ça durable.)

### Frontend (`src/`)
- **Routing** : App Router. Le groupe `(app)/` partage un layout avec la `BottomNav` (5 onglets). La **carte est la racine `/`** (`(app)/page.tsx`) ; les autres onglets ont un segment : `/affluence`, `/programme`, `/autour`, `/ma-soiree`. `/planning` et `/strategie` sont des pages autonomes hors nav. (L'ancien Deck de swipe `/decouvrir` a été remplacé par `/affluence`.)
- **Onglet Affluence** (`(app)/affluence` + `components/AffluenceMap`) : carte « météo » de l'affluence ESTIMÉE — pas de pins, un calque MapLibre `heatmap` pondéré exponentiellement (`(popularity/100)^3`) par `popularity`, rayon data-driven (les têtes d'affiche rayonnent beaucoup plus loin). Fond bleuté intra-périph (jamais de noir) + anneau du périph. Réutilise `useFilters` (le scrubber horaire fait bouger la foule) et les fiches `EventPanel`/`EventSheet`. Points cliquables filtrés à `popularity >= POINT_MIN_POP` (42 = Viva l'Orchestra) pour épurer ; la heatmap, elle, garde tous les events. **Garde-fou** : libellé « affluence estimée », pas une vraie mesure de foule.
- **Données** : `useEvents` fait l'unique `fetch('/data/events.json')`. `useFilters(events)` porte toute la logique de filtrage (genre, arrondissement, tranche horaire) ; il alimente aussi `mapFilter` (expression MapLibre) consommée par `components/Map`.
- **Modèle horaire** — point clé, souvent mal compris :
  - Le festival 2026 tombe le **dimanche 21** (un seul jour visible). `useFilters` filtre sur `VISIBLE_SESSION_DATE = '2026-06-21'`. Les ~25 concerts du samedi 20 sont **présents dans la donnée mais masqués** (changer la constante les réaffiche).
  - Le filtre temps n'est PAS un axe continu : c'est **5 tranches** (`lib/slots.ts` : matin / début-aprem / fin-aprem / soirée / nuit), bornées sur la densité réelle des concerts. Le scrubber de la carte sélectionne une tranche. (`lib/festival.ts` garde des constantes d'axe continu héritées, mais l'UI active passe par les slots.)
- **Genres** : union fermée `Genre` dans `types/event.ts` + `GENRE_CONFIG` dans `data/genres.ts`. Les points de carte ont une **couleur unique (corail)** — la couleur n'encode plus le genre (67% des concerts sont multi-genres). Les chips de genre servent au filtrage.
- **i18n FR/EN/ZH** : `contexts/LanguageContext` + `lib/i18n.ts` (interface `T` typée, clés `slots`/`genres` indexées par id). Langue persistée en `localStorage('fm_lang')`, sélecteur sur la carte.
- **Favoris / "ma soirée"** : `useFavorites` + `lib/session.ts` (persistance locale).

### Discipline Timezone (gotcha récurrent)
Tout est **forcé en `Europe/Paris`** (formatters dans `lib/time.ts`). Raison : le serveur rend en UTC, le client en local → un format d'heure divergent provoque un **mismatch d'hydratation React (#418)** puis des `RangeError` en cascade. Les tests tournent sous `TZ=UTC` justement pour attraper ces divergences (`time.test.ts`, `session.test.ts`, `status.test.ts`). Ne jamais formater une date sans passer par les helpers de `lib/time.ts`.

### Gotchas maplibre-gl v5
- `getClusterExpansionZoom` renvoie une **Promise** (plus de callback).
- `queryRenderedFeatures({layers})` renvoie `[]` si **un seul** layer listé n'existe pas → ne lister que les layers réellement présents.
- Style primaire Stamen Watercolor (Stadia, clé requise, allowlist domaine en prod) avec **fallback OpenFreeMap Liberty** (sans clé, robustesse jour J).

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

### Workflows auto actifs

1. Nouvelle issue/PR sur le repo → ajoutée au project en Status: Todo
2. PR ouverte avec `Closes #N` ou liée à une issue → Status passe en **In Progress**
3. PR mergée → Status passe en **Done**
4. Issue fermée manuellement → Status passe en **Done**
5. Sub-issues auto-ajoutées au project

## Déploiement & Workflow Git

**Repo** : https://github.com/agentveciademo-boop/Fete2LaMusique (compte commun `agent-vecia-demo`)

**Branches** :
- `prod` — default GitHub + branche de production sur Vercel
- `dev` — branche de preview, liée à `dev.fete2lamusique.paname.ai`

**Domaines live** (tous servent la même carte) :
- 🌐 Apex : https://paname.ai (sert directement la carte ; domaine ombrelle, seul site actif pour l'instant)
- 🌐 Prod : https://fete2lamusique.paname.ai
- 🧪 Dev : https://dev.fete2lamusique.paname.ai (publique, pas de protection)

**Workflow** :
```bash
git push origin dev    # → deploy preview auto
git push origin prod   # → deploy prod auto
```
Pour merger `dev` → `prod` : `git checkout prod && git merge dev && git push origin prod` (ou PR).

**Stack hébergement** :
- **Vercel Hobby** : team `agentveciademo-2709's projects`, projet `fete2lamusique`. Accès via SSO Google sur le Gmail commun.
- **DNS** : Cloudflare (zone `paname.ai`). Apex `paname.ai` + CNAME `fete2lamusique`/`dev.fete2lamusique` → Vercel, **proxy DNS only** (gris, pas orange — l'orange casse le SSL Vercel).
- **Deployment Protection** : désactivée. Previews publiques, cohérent avec la stratégie "construire en public".

## Timeline

- **21 juin 2026 (dimanche)** : Fête de la Musique — deadline absolue
- **21 mai 2026** : date limite d'inscription des organisateurs sur OpenAgenda
- **15-20 juin 2026** : données complètes sur l'API OpenAgenda

## Documentation

- [docs/architecture.md](docs/architecture.md) — vue d'ensemble (⚠️ certains docs décrivent l'ancien plan Supabase, abandonné au profit du JSON-first)
- [docs/design-decisions.md](docs/design-decisions.md) — décisions filtres et rationale
- [docs/arbitrated-points.md](docs/arbitrated-points.md) — points arbitrés, classés par coût de retour en arrière (🔴 / 🟡 / 🟢)
- [docs/decisions-analysis.md](docs/decisions-analysis.md) — analyse critique point par point
- [docs/data-sources.md](docs/data-sources.md) — recherche OpenAgenda + alternatives
- [etl/AJOUTER-UN-CONCERT.md](etl/AJOUTER-UN-CONCERT.md) — ajouter un concert manuellement

## Contraintes importantes

- **PWA, pas natif** : installable iOS/Android via "Ajouter à l'écran d'accueil". `manifest.json` → `start_url: "/"` (la carte).
- **OpenAgenda gratuit** : compte gratuit, clé publique. Pas de paiement.
- **Stadia Maps free tier** : 200k credits/mois, allowlister le domaine en prod ; fallback OpenFreeMap doit rester fonctionnel.
- **MVP carte d'abord** : le chatbot vient après, ne pas ralentir la carte pour ça.
- **Prix** : tout est `free` à la FdM. L'inférence regex produisait des faux "payant" → l'ETL ne devine plus le prix.

## Ce qu'on a explicitement écarté

- Filtres **Prix**, **Plein air/salle**, **Sous-genres** : retirés (données trop pauvres/trompeuses). Restent Genre + Tranche horaire + Arrondissement.
- Filtre `size` (small/medium/large) : impossible à inférer fiablement depuis OpenAgenda.
- DB / Supabase : remplacé par le JSON-first (une DB ne reviendra que si le chatbot v2 démarre).
- MCP direct vers OpenAgenda : rate limits + latence + pas de normalisation.
- App native : trop long avant le 21 juin, PWA suffit.
- **Deck de swipe (`/decouvrir`)** : remplacé par l'onglet Affluence. Les favoris « Ma soirée » se constituent désormais via le ♥ de la fiche concert (`EventContent`), plus par le swipe.

Voir [docs/design-decisions.md](docs/design-decisions.md) pour le rationale complet.
