# Architecture

## Vue d'ensemble — JSON-first (MVP)

Pas de backend pour le MVP. Un seul projet Next.js avec un module ETL standalone qui produit un JSON statique. Voir [decisions-analysis.md](decisions-analysis.md) B5 pour le rationale.

```text
┌─────────────────────────────────────────────────┐
│  OpenAgenda API v2                              │
│  Agenda UID 4641572 (Fête de la Musique 2026)   │
└──────────────────┬──────────────────────────────┘
                   │ etl/sync.ts (GitHub Actions cron)
                   │ daily → hourly J-7
                   ▼
┌─────────────────────────────────────────────────┐
│  public/data/events.json (commité dans le repo) │
│  - tous les events normalisés                   │
│  - schema défini dans src/types/event.ts        │
└──────────────────┬──────────────────────────────┘
                   │ Vercel CDN edge cache
                   │ (un commit → un redeploy → cache invalidé)
                   ▼
┌─────────────────────────────────────────────────┐
│  Next.js PWA (déployée sur Vercel)              │
│  - fetch('/data/events.json') au mount          │
│  - Context React pour la donnée                 │
│  - Filtrage GPU via MapLibre setFilter          │
│  - Chatbot Mistral en v2 (déclenchera DB)       │
└─────────────────────────────────────────────────┘
```

## Quand passer à une DB

Phase 2 (chatbot Mistral) introduira une DB Postgres pour permettre des requêtes server-side complexes ("événements jazz dans le 11e après 22h en plein air"). À ce moment-là :
- Choix probable : Supabase ou Neon (PostGIS natif)
- Le schéma de [data-schema.md](data-schema.md) est conçu pour migrer naturellement
- L'ETL bascule de `writeFile(json)` à `upsert(rows)`

## Module ETL (`etl/` dans le monorepo)

**Responsabilité** : produire `public/data/events.json` depuis OpenAgenda.

**Composants** :

- `etl/sync.ts` (TypeScript) : fetch OpenAgenda → normalize → write JSON
- `etl/genre-mapping.json` : mapping versionné des tags bruts → genres canoniques
- Normalisation des genres via **mapping statique uniquement** (pas de Mistral dans l'ETL)
- Inférence `is_outdoor` depuis venue name (heuristiques regex). `attendanceMode` OpenAgenda ne distingue pas outdoor/indoor
- Détection prix (gratuit / payant / prix libre / unknown) depuis champ `conditions` (regex)
- Extraction `arrondissement` depuis code postal pour Paris, `commune` et `code_insee` pour la petite couronne
- Splitting des events multi-timings en N entries
- Tri stable par `start_time` (minimise diff git)
- Logs JSON structurés (count synced, errors, top tags non mappés)

**Fréquence** (GitHub Actions cron, fichier `.github/workflows/sync-events.yml`) :

- Daily jusqu'au 14 juin 2026
- Hourly du 14 au 20 juin 2026
- Pas de sync le 21 juin (données figées)

**Déploiement** : GitHub Actions exécute `bun run etl/sync.ts` + commit le JSON. Le push déclenche un redeploy Vercel → cache CDN invalidé.

## Frontend (Next.js PWA, même monorepo)

**Responsabilité** : afficher la carte, les filtres, le détail des events.

**Composants** :

- Au mount : `fetch('/data/events.json')` → stockage dans un Context React
- Carte MapLibre GL JS, style primary Stamen Watercolor, fallback OpenFreeMap Liberty
- Source GeoJSON unique + layer filter natif MapLibre (pas de React markers)
- Clustering natif MapLibre (algorithme Supercluster intégré)
- Filtres : horaire, genre, plein air/salle, prix — appliqués via `map.setFilter(...)` côté GPU
- Panel détail (bottom sheet mobile via `vaul`, sidebar desktop), composant `EventContent` partagé
- Géolocalisation utilisateur
- PWA manifest + apple-touch-icon pour install iOS/Android (spike obligatoire avant code)

**Déploiement** : Vercel (free tier suffit pour le MVP).

## Contrat d'interface ETL ↔ Frontend

L'unique point de couplage est le **format du JSON produit** par l'ETL, consommé par le frontend.

Format :

```json
{
  "generated_at": "2026-06-15T04:00:00Z",
  "source_agenda_uid": 4641572,
  "event_count": 1842,
  "events": [
    {
      "id": "...",
      "openagenda_uid": 123456,
      "title": "Concert Jazz République",
      "lat": 48.867,
      "lng": 2.364,
      "start_time": "2026-06-21T19:00:00+02:00",
      "end_time": "2026-06-21T22:00:00+02:00",
      "genres": ["jazz", "blues"],
      "is_outdoor": true,
      "price_type": "free",
      "venue_name": "Place de la République",
      "address": "Place de la République, 75011 Paris",
      "arrondissement": 11,
      "commune": "Paris",
      "description": "...",
      "image_url": null,
      "source_url": "https://..."
    }
  ]
}
```

Le type TypeScript exact vit dans `src/types/event.ts` (créé par le frontend) et est importé par l'ETL.

**Filtrage côté client** : tous les events sont chargés en mémoire. Le frontend applique les filtres en JS pur (pas de SQL, pas de query). Pour le filtre genre : `events.filter(e => e.genres.some(g => selectedGenres.includes(g)))` — sémantique OR.

## Pourquoi JSON statique

- **Simplicité** : un seul projet à déployer, un seul artefact à debug
- **Robustesse** : zéro panne possible le 21 juin (Vercel CDN edge, immutable)
- **Coût** : zéro infra payante
- **Performance** : ~80KB gzippé chargé une fois, puis tout en mémoire client
- **Pas de rate limit** : la source `/data/events.json` est servie par CDN
- **Versioning naturel** : chaque sync produit un commit, l'historique git remplace les logs de migration

## Migration vers DB (phase 2)

Quand le chatbot Mistral v2 démarrera, on ajoutera Postgres (probablement Supabase). À ce moment :

- L'ETL bascule de `writeFileSync(events.json)` à `upsertMany(events)`
- Le frontend garde le même Context, mais alimenté par `fetch('/api/events')` au lieu du JSON statique (compat possible : on garde les deux chemins)
- Le schéma de [data-schema.md](data-schema.md) est conçu pour cette migration naturelle
