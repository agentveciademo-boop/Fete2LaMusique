# Prompt — ETL JSON-first

À exécuter dans `/Users/tanguy/dev/projets/Fete2LaMusique/`. Le frontend est développé en parallèle dans le **même repo** (monorepo) à partir de [docs/prompts/frontend-mvp.md](frontend-mvp.md).

**Lecture obligatoire avant de coder** : `CLAUDE.md`, `docs/architecture.md`, `docs/data-schema.md` (sert de type Event de référence), `docs/data-sources.md`, `docs/design-decisions.md`, `docs/arbitrated-points.md`, `docs/decisions-analysis.md` (notamment **B5 — JSON statique**).

---

```
Tu vas mettre en place le pipeline de données pour l'app
"Fête de la Musique Paris 2026".

## Mission

Produire et maintenir un fichier `public/data/events.json` qui contient
tous les events normalisés. **Pas de DB. Pas de backend. Pas de PostGIS.**

Le frontend fetch ce JSON au démarrage et fait tout le filtrage côté
client via MapLibre. Vercel CDN sert le JSON avec edge caching gratuit.

### Pourquoi JSON statique (pas DB) pour le MVP

- Volume estimé < 5000 events, ~80KB gzippé
- Tout le filtrage est déjà côté client (MapLibre GPU)
- Zéro infra à maintenir, zéro coût, zéro panne le 21 juin
- L'event est figé le 21 juin : la fraîcheur sub-horaire est inutile
- YAGNI : on ajoute une DB quand le chatbot v2 démarrera, avec le luxe
  de la modéliser pour les vraies requêtes qu'on aura

### Si tu veux basculer en DB (cas exceptionnel)

Décision possible mais **justifie par écrit** dans `docs/backend-tech-choice.md`
avec chiffres concrets, avant de l'implémenter. Critères qui justifieraient :
- Volume mesuré > 5000 events après recon
- Besoin spécifique de filtre géo server-side avant le 21 juin
- Volume > 500KB gzippé (impacte le first paint mobile)

Sinon, pars JSON sans débat.

## PHASE 1 — Recon OpenAgenda 2025

Cible : agenda 2025 (UID `7476421`) qui contient les données réelles de
l'an dernier. C'est notre échantillon pour calibrer regex, vocabulaire,
et valider les hypothèses.

**Prérequis** : compte gratuit sur openagenda.com, clé publique dans
`.env.local` sous `OPENAGENDA_API_KEY`.

Écris `etl/recon.ts` (exécutable via `bun run etl/recon.ts` ou
`npx tsx etl/recon.ts`).

Le script :
1. Fetch tous les events de l'agenda 2025 dans un rayon de 10km autour
   de Paris (centre 48.8534, 2.3488), en paginant (size=300)
2. Génère `docs/recon-report.md` avec les sections suivantes. Chaque
   section : seuil numérique de décision + valeur observée + recommandation
   auto + case à cocher

**Q1. Volume total**
- Mesure : nombre d'events, nombre de timings, taille estimée du JSON
  output (gzippé)
- Seuil : si taille gzippée > 500KB, escalate vers DB

**Q2. Vocabulaire genres**
- Seuil : tout genre normalisé représentant ≥ 3% du volume mérite son chip
- Mesure : top 50 tags bruts + fréquence, top 10 noms de `tagGroups[].name`
- Reco auto : liste des genres canoniques retenus

**Q3. attendanceMode**
- Mesure : distribution des valeurs (1/2/3)
- Décision : confirme que ce champ ne suffit pas pour is_outdoor

**Q4. is_outdoor : garder ou retirer ?**
- Seuil : NULL < 30% → garder le filtre ; sinon retirer le filtre UI mais
  garder le champ (utilisable comme badge informatif)
- Mesure : appliquer regex outdoor (`rue|place|parc|jardin|square|esplanade|
  quai|parvis`) et indoor (`salle|théâtre|conservatoire|bar|café|club|
  auditorium|église`) sur `location.name + location.address`

**Q5. price_type**
- Seuil : unknown < 40% → filtre 3-états utile ; sinon toggle binaire
  "Cacher payants" plus tolérant
- Mesure : parser `conditions.fr` avec regex free / paid / prix_libre

**Q6. Multi-genre**
- Mesure : distribution du nombre de tags par event après normalisation
- Décision : confirme la nécessité du multi-genre

**Q7. Présence des champs critiques**
- Mesure : taux de NULL sur `location.latitude`, `location.longitude`,
  `timings[0].begin`, `timings[0].end`, `location.postalCode`
- Décision : si > 5% sur lat/lng → rejeter les events sans coordonnées

**Q8. Échantillons qualitatifs** (œil humain)
- 30 venue names aléatoires
- 30 valeurs de `conditions.fr`
- 10 `tagGroups[].name` distincts les plus fréquents

**Section finale "Décisions implicites"** :

| Question | Seuil | Mesuré | Reco auto | Décision humaine |
|----------|-------|--------|-----------|------------------|
| Q1 — taille JSON | < 500KB gzippé | ... | JSON statique OK / escalate DB | [ ] |
| Q2 — vocab genres | ≥3% | ... | 9 chips listés | [ ] |
| Q4 — is_outdoor | NULL <30% | ... | GARDER filtre / Garder badge seulement | [ ] |
| Q5 — price_type | unknown <40% | ... | 3-états / binaire | [ ] |
| ... | | | | |

## PHASE 2 — Pipeline JSON

### 2.1 ETL script

Écris `etl/sync.ts` qui produit `public/data/events.json`.

Structure attendue :

```ts
// etl/sync.ts
import fs from 'node:fs'
import path from 'node:path'

const SOURCE_AGENDA_UID = process.env.NODE_ENV === 'production'
  ? 4641572   // Fête de la Musique 2026
  : 7476421   // 2025 archive pour dev

async function sync() {
  const events = await fetchAllOpenAgendaEvents(SOURCE_AGENDA_UID)

  const normalized: Event[] = []
  const unmappedTags = new Map<string, number>()

  for (const raw of events) {
    try {
      const items = normalizeEvent(raw, unmappedTags)
      // un event multi-timings → plusieurs lignes
      normalized.push(...items)
    } catch (e) {
      log({ level: 'error', uid: raw.uid, msg: e.message })
    }
  }

  // Tri stable (par start_time) pour minimiser les diffs git
  normalized.sort((a, b) => a.start_time.localeCompare(b.start_time))

  const outputPath = path.resolve('public/data/events.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    source_agenda_uid: SOURCE_AGENDA_UID,
    event_count: normalized.length,
    events: normalized,
  }, null, 2))

  log({
    level: 'info',
    msg: 'sync complete',
    event_count: normalized.length,
    output_size_bytes: fs.statSync(outputPath).size,
    top_unmapped_tags: topN(unmappedTags, 20),
  })
}

// FILL FROM RECON: mapping final
function normalizeGenres(rawTags: string[]): Genre[] { /* ... */ }

// FILL FROM RECON: regex list
function inferOutdoor(event: OpenAgendaEvent): boolean | null { /* ... */ }

// FILL FROM RECON: regex prix
function parsePrice(conditions: string): PriceType { /* ... */ }
```

Doit gérer :
- Pagination OpenAgenda (size=300, offset incrémental, stop quand vide)
- Retry avec backoff exponentiel sur erreur réseau (3 tentatives)
- Validation des champs critiques (lat/lng obligatoires, skip sinon)
- Splitting d'un event multi-timings en N entries
- Logs JSON structurés (un objet par ligne, parseable jq)
- Variables d'env : `OPENAGENDA_API_KEY`

### 2.2 Type Event partagé

Le type `Event` produit doit matcher **exactement** ce que le frontend
attend dans `src/types/event.ts`. Coordonne avec le frontend :

- Si le frontend a déjà créé `src/types/event.ts`, importe-le dans
  l'ETL : `import type { Event } from '@/types/event'`
- Si non, crée-le toi-même en suivant le schéma de `docs/data-schema.md`
  (adapté : pas de PostGIS, juste `lat: number, lng: number`)

### 2.3 GitHub Actions cron

Crée `.github/workflows/sync-events.yml` :

```yaml
name: Sync events JSON

on:
  schedule:
    - cron: '0 4 * * *'   # daily à 04h UTC (06h Paris)
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run etl/sync.ts
        env:
          OPENAGENDA_API_KEY: ${{ secrets.OPENAGENDA_API_KEY }}
          NODE_ENV: production
      - name: Commit JSON if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/events.json
          git diff --staged --quiet || git commit -m "chore: sync events $(date -u +%Y-%m-%dT%H:%MZ)"
          git push
```

**Important** : ajouter une fréquence horaire en J-7 :
- Du 14 juin 2026 au 20 juin 2026 : `0 * * * *` (hourly)
- Le 21 juin : pas de sync (données figées)

Approche simple : deux workflows séparés ou un seul avec une condition de date.

### 2.4 API contract

Écris `docs/api-contract.md` qui documente :
- Path frontend : `GET /data/events.json`
- Format de réponse :
  ```json
  {
    "generated_at": "2026-06-15T04:00:00Z",
    "source_agenda_uid": 4641572,
    "event_count": 1842,
    "events": [{ ...Event }, ...]
  }
  ```
- Type `Event` (référence vers `src/types/event.ts`)
- Pas d'auth (fichier public statique servi par Vercel CDN)
- Cache headers Vercel : on s'appuie sur la revalidation automatique
  par redeploy (le commit du JSON déclenche un nouveau build Vercel)

## PHASE 3 — Patches docs basés sur recon

Une fois `docs/recon-report.md` produit et `etl/sync.ts` fonctionnel :

- `docs/data-schema.md` : adapter le format de table SQL en **schéma TypeScript** (puisqu'on n'a plus de DB). Retire PostGIS, garde le shape des données. Marqueurs PENDING RECON remplacés par le vocabulaire final.
- `docs/design-decisions.md` : confirme ou retire is_outdoor et price selon seuils
- `docs/arbitrated-points.md` : coche tous les statuts post-recon et mets à jour les cascades (A1 reclassé selon B5 confirmé)
- `etl/genre-mapping.json` : version finale du mapping versionné
- `CLAUDE.md` : reflet le choix JSON-first confirmé

## Contraintes strictes

- **Pas de DB pour le MVP** sauf si recon démontre escalade nécessaire (avec chiffres)
- **Pas de Mistral dans l'ETL** — normalisation par mapping statique
- **Idempotence** : tout re-run produit le même JSON (modulo `generated_at`)
- **Pas de tests automatisés** — MVP. Tests manuels via le sync 2025
- **Filtre géo côté API OpenAgenda** : radius 10km autour de Paris

## Critère de succès

- `public/data/events.json` existe, valide JSON, ~80KB
- L'agenda 2025 est intégralement présent dans le JSON
- Le frontend peut `fetch('/data/events.json')` et utiliser les events
- GitHub Actions cron tourne et commit le JSON automatiquement
- `docs/recon-report.md` produit avec toutes les Q1-Q8 mesurées
- Tous les .md sont cohérents, sans incohérences inter-docs
- Tous les statuts dans `docs/arbitrated-points.md` sont marqués
- `docs/api-contract.md` permet au frontend de consommer sans deviner
```
