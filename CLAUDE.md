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

## État actuel

Phase de planification terminée. Deux chantiers à lancer en parallèle :
- **Frontend** : prompt [docs/prompts/frontend-mvp.md](docs/prompts/frontend-mvp.md) — carte + filtres avec données mock
- **Backend/ETL** : prompt [docs/prompts/backend-etl.md](docs/prompts/backend-etl.md) — recherche techno, recon OpenAgenda 2025, ETL complet

Le frontend et l'ETL se synchronisent via un contrat d'API documenté dans [docs/architecture.md](docs/architecture.md) et le schéma de [docs/data-schema.md](docs/data-schema.md).

**Questions ouvertes** (à trancher par l'agent ETL via le recon OpenAgenda 2025) :
- Vocabulaire genres définitif (9 vs 13+, avec ou sans fanfare/chorale/soul/funk/trad)
- Filtre `is_outdoor` gardé ou retiré selon taux de NULL observé
- Comportement UI sur `price_type = 'unknown'` selon volume observé
- Règle multi-genre : 1 tag brut → 1 genre canonique ou plusieurs

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
