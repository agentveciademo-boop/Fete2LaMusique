# Prompt — MVP Carte Frontend

À exécuter dans un projet Next.js vierge dans `/Users/tanguy/dev/projets/Fete2LaMusique/`. Données mock uniquement, pas de backend.

**Lecture obligatoire avant de coder** : `CLAUDE.md`, `docs/architecture.md`, `docs/design-decisions.md`, `docs/data-schema.md` (pour le type `Event`).

---

```
Tu vas créer le frontend d'une webapp PWA "Fête de la Musique Paris 2026" —
une carte interactive des concerts du 21 juin.

**Architecture JSON-first** (voir docs/decisions-analysis.md B5) : pas de
backend ni de DB. Les données viennent d'un fichier `public/data/events.json`
produit par l'ETL (en parallèle dans le même repo). Le frontend fait :
1. Un `fetch('/data/events.json')` au mount
2. Stocke le résultat dans un Context React
3. Tout le filtrage/clustering est côté client via MapLibre

Pour le MVP, tu travailles avec des données MOCK directement dans le code
(src/data/mock-events.ts). Quand l'ETL produira un vrai events.json, tu
pourras basculer en remplaçant la source du Context — pas de changement
de logique de filtrage.

## Stack technique

- Next.js 14+ (App Router, TypeScript, src/ directory)
- react-map-gl v8 + maplibre-gl (WebGL rendering)
- Tailwind CSS v4
- shadcn/ui (Slider, ToggleGroup, Button, Badge, Sheet, Sonner)
- vaul (bottom sheet drawer mobile)
- framer-motion (animations panel)
- date-fns + date-fns/locale/fr (formatage FR)
- lucide-react (icônes)

**Pas de TanStack Query** : architecture JSON-first (voir docs/decisions-analysis.md B5). Un seul `fetch('/data/events.json')` au mount, stocké dans un Context React. Données figées le 21/06.

## Données mock

Crée `src/data/mock-events.ts` avec 50 événements fictifs sur Paris,
incluant une **zone dense** autour de la Place de la République
(~15 events dans un rayon de 300m) pour bien tester le clustering.

Type TypeScript (à mettre dans `src/types/event.ts`) :

```typescript
export type Genre =
  | 'jazz' | 'rock' | 'classique' | 'electro'
  | 'folk' | 'rap' | 'variete' | 'world' | 'autres'

export type PriceType = 'free' | 'paid' | 'prix_libre' | 'unknown'

export type Event = {
  id: string
  title: string
  venue_name: string
  address: string
  arrondissement: number | null   // 1-20, null hors Paris
  commune: string                  // 'Paris' pour le MVP
  lat: number
  lng: number
  start_time: string               // ISO 8601, le 2026-06-21
  end_time: string                 // ISO 8601
  genres: Genre[]                  // multi-genre, ordonné par pertinence
  is_outdoor: boolean | null       // null = indéterminé
  price_type: PriceType
  price_detail: string | null
  description: string              // 2-3 phrases
  image_url: string | null
}
```

Distribution attendue pour le mock :
- 50 events au total, ~15 concentrés autour de République (48.867, 2.364)
- Le reste réparti sur les 20 arrondissements
- Horaires entre 14h et 02h (lendemain)
- **Genres** : 65% mono-genre, 30% bi-genre (ex. ['jazz', 'blues']), 5% tri-genre
- Premier genre du tableau = couleur du marqueur, doit être cohérent
- 70% gratuits, 20% prix libre, 5% payants, 5% unknown
- 60% en plein air, 30% en salle, 10% indéterminé (null)
- Place autour de vrais lieux : République, Bastille, Montmartre,
  Saint-Germain, Canal Saint-Martin, Oberkampf, Belleville, Père-Lachaise,
  Trocadéro, Buttes-Chaumont, Place des Vosges, Châtelet

## Configuration des genres

Crée `src/data/genres.ts` avec la config UI :

```typescript
export const GENRE_CONFIG: Record<Genre, {
  label: string
  color: string
  icon: string  // emoji
}> = {
  jazz:      { label: 'Jazz',      color: '#F59E0B', icon: '🎷' },
  rock:      { label: 'Rock',      color: '#EF4444', icon: '🎸' },
  classique: { label: 'Classique', color: '#8B5CF6', icon: '🎹' },
  electro:   { label: 'Électro',   color: '#06B6D4', icon: '🎧' },
  folk:      { label: 'Folk',      color: '#10B981', icon: '🪕' },
  rap:       { label: 'Rap',       color: '#F97316', icon: '🎤' },
  variete:   { label: 'Variété',   color: '#EC4899', icon: '🎵' },
  world:     { label: 'World',     color: '#14B8A6', icon: '🌍' },
  autres:    { label: 'Autres',    color: '#6B7280', icon: '❓' },
}
```

## Carte

Composant `src/components/Map.tsx`.

Style : deux options à configurer via env var. Par défaut, primary = Stamen Watercolor (esthétique), fallback automatique = OpenFreeMap Liberty (robustesse jour J).

- Primary : `https://tiles.stadiamaps.com/styles/stamen_watercolor.json`
- Fallback (au onError du style ET fallback de robustesse jour J) : `https://tiles.openfreemap.org/styles/liberty`

**Important** : OpenFreeMap n'est pas qu'un fallback technique mais aussi un plan B délibéré. Stadia free tier (200k crédits/mois) peut être saturé sur événement viral. Le frontend doit gérer un bascule simple via env var sans rebuild.

Centre initial : `[2.3488, 48.8534]` (Paris), zoom 12.
Bornes zoom : min 10, max 18.

Contrôles MapLibre : NavigationControl (zoom + boussole) en bas à droite.

## CRITIQUE : Marqueurs via GeoJSON natif MapLibre (PAS de markers React)

Charge TOUS les events dans une seule source GeoJSON avec clustering natif :

```js
map.addSource('events', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [...] },
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50
})
```

Trois layers MapLibre :

1. `events-clusters` (type `circle`, filtre `point_count > 1`)
   - Cercle blanc/translucide, taille proportionnelle au count
2. `events-cluster-count` (type `symbol`, label avec le nombre)
3. `events-unclustered` (type `circle`, taille 8-12px)
   - Couleur via expression `["match", ["get", "genre_primary"], "jazz", "#F59E0B", "rock", "#EF4444", ..., "#6B7280"]`
   - Stroke 2px blanc pour visibilité sur fond aquarelle

**Filtrage** : utilise `map.setFilter('events-unclustered', [...])` quand
les filtres changent. PAS de re-render React des features.

Properties à mettre dans chaque feature GeoJSON :

- `id`, `title`
- `genre_primary` (premier de la liste)
- `genres` (array — préservé tel quel dans GeoJSON, MapLibre supporte
  `["in", "jazz", ["get", "genres"]]`)
- `start_ts` (Unix timestamp en ms, plus simple à comparer dans les
  expressions MapLibre que ISO strings)
- `end_ts`
- `is_outdoor` (boolean ou null encodé en `-1`)
- `price_type` (string)

## Animation pulse — limitée à N=5 events imminents

Les events qui démarrent dans la prochaine heure (par rapport à l'heure
du slider, pas l'horloge système) doivent pulser pour attirer l'œil.

Pour éviter la saturation visuelle :
- Sélectionner au max **5 events** les plus imminents (start_time ≥ heure_slider)
- Créer un layer dédié `events-pulse` qui ne contient que ces 5 events
- Animer `circle-radius` et `circle-opacity` via un seul `requestAnimationFrame`
  qui appelle `map.setPaintProperty('events-pulse', 'circle-radius', ...)`
  avec une expression d'interpolation

## Filtres — comportement

### Barre de filtres

- Desktop (≥ 768px) : barre fixe en haut, sous le header, glassmorphism
- Mobile (< 768px) : bouton flottant en haut à droite qui ouvre un
  bottom sheet vaul avec tous les filtres

### Filtre 1 — Horaire (slider)

Composant `src/components/filters/TimeFilter.tsx`

- Slider shadcn de 12h00 (21 juin) à 02h00 (22 juin)
- Pas de 15 minutes
- Label dynamique au-dessus : "À 19h15"
- Bouton "Maintenant" à droite : reset sur `new Date()` (ou 19h00 si hors plage)
- État stocké : `Date` complète (gère le rollover minuit)

**Logique de filtre** :
- event visible si `start_ts ≤ selected_ts AND end_ts ≥ selected_ts`
- event sans `end_ts` : visible si `start_ts` dans les 3h suivantes

**IMPORTANT** : cette heure du slider drive aussi le calcul du statut
dans le panel détail (pas l'horloge système). Cohérence UX critique.

### Filtre 2 — Genres (chips)

Composant `src/components/filters/GenreFilter.tsx`

- 9 chips multi-select via shadcn ToggleGroup type="multiple"
- Affichage : icône + label, couleur de fond = couleur du genre quand sélectionné
- État vide (aucun sélectionné) = tous les events affichés
- Mobile : scroll horizontal avec snap

**Sémantique : OR** (un event match si ≥ 1 genre sélectionné). Côté
MapLibre, expression :
```js
["any",
  ["in", "jazz", ["get", "genres"]],
  ["in", "rock", ["get", "genres"]],
  ...
]
```

### Filtre 3 — Lieu (3 états)

Composant `src/components/filters/OutdoorFilter.tsx`

- ToggleGroup type="single", 3 options exclusives :
  - `Tout` (default)
  - `🌳 Plein air`
  - `🏠 En salle`

Logique :
- `Tout` : aucun filtre appliqué
- `Plein air` : `is_outdoor === true` (les NULL masqués)
- `En salle` : `is_outdoor === false` (les NULL masqués)

### Filtre 4 — Prix (3 états)

Composant `src/components/filters/PriceFilter.tsx`

- ToggleGroup type="single" :
  - `Tout`
  - `💸 Gratuit`
  - `🪙 Prix libre inclus`

Logique :
- `Tout` : tous events (y compris unknown)
- `Gratuit` : `price_type === 'free'`
- `Prix libre inclus` : `price_type IN ('free', 'prix_libre')`

### Compteur de résultats

Composant `src/components/filters/ResultCount.tsx`
À droite de la barre (ou en haut du bottom sheet mobile) :
"23 concerts" — mis à jour en temps réel.

## Panel détail d'un événement

Au clic sur un marqueur unclusterisé :
- Mobile : bottom sheet vaul (snap points 30%, 60%, 95%)
- Desktop : sidebar droite 400px, slide via framer-motion

**Composant partagé** `src/components/EventContent.tsx` contient le contenu,
les wrappers `EventPanel.tsx` (desktop) et `EventSheet.tsx` (mobile)
gèrent juste le layout/animation.

Contenu (dans EventContent) :

1. Image hero (200px hauteur), placeholder gradient si null
   - Gradient : `from-orange-400 via-pink-500 to-purple-600`
2. Badges genres (un par genre, couleur correspondante via GENRE_CONFIG)
3. Titre `text-2xl font-bold`
4. Nom du lieu en gras, adresse en gris dessous
5. Horaire : `19h00 → 23h00` avec icône Clock
6. **Statut dynamique calculé par rapport à l'heure du slider** :
   - `🟢 En cours` (start ≤ slider_time ≤ end)
   - `🔜 Commence dans 1h30` (start dans le futur < 3h)
   - `⏰ Plus tard` (start dans le futur ≥ 3h)
   - `✅ Terminé` (end < slider_time)
7. Pastille prix : "Gratuit" vert, "Prix libre" jaune, "10€" gris, "Prix non précisé" gris clair
8. Pastille lieu : "🌳 Plein air" ou "🏠 En salle" si défini, masquée sinon
9. Description (texte)
10. Deux boutons CTA pleine largeur :
    - "Ouvrir dans Google Maps"
      → `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    - "Ouvrir dans Citymapper"
      → `https://citymapper.com/directions?endcoord=${lat},${lng}&endname=${encodeURIComponent(venue_name)}`

Fermeture : X en haut à droite (desktop), swipe down (mobile).

## Géolocalisation

Composant `src/components/UserLocation.tsx`

- Bouton flottant en bas à gauche (icône Crosshair lucide)
- Au clic : `navigator.geolocation.getCurrentPosition`
- Affiche un marqueur bleu pulsant à la position via un layer dédié
- Centre la carte avec `flyTo({ zoom: 14 })`
- Si permission refusée : toast d'erreur via shadcn Sonner

## Header

`src/components/Header.tsx` — fixe, hauteur 56px, glassmorphism.

- Gauche : "🎵 Fête de la Musique · Paris 2026"
- Droite (desktop) : compteur "23 concerts"
- Pas de lien GitHub ni autre lien dev

## Layout

- `app/layout.tsx` : meta PWA, viewport, font Inter, `<html lang="fr">`
- `app/page.tsx` : Header + Carte plein écran (h-[100dvh] - 56px)
- La carte occupe tout l'espace sous le header

## PWA — spike obligatoire à faire en premier

**Avant de tout coder, fais un spike de 30 min** pour vérifier que la PWA s'installe correctement sur iOS et Android :

1. Créer un Next.js minimal avec uniquement `app/layout.tsx` + manifest + icônes
2. Déployer sur Vercel (preview deploy suffit)
3. Tester :
   - Safari iOS 16.4+ : "Ajouter à l'écran d'accueil" → app s'ouvre en mode standalone (sans barre Safari)
   - Chrome Android : "Installer l'application" → idem
4. Si KO sur iOS : ajuster `apple-mobile-web-app-capable`, `apple-touch-icon` 180x180 obligatoire, `<meta name="apple-mobile-web-app-status-bar-style">`

Sans ce spike, on risque de promettre "installable iOS/Android" et de découvrir le 20 juin que le manifest est cassé.

Une fois le spike OK, continuer avec le reste du prompt.

## PWA — config

Dans `app/layout.tsx`, balises meta :
- viewport: `width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover`
- theme-color: `#FF6B6B`
- apple-mobile-web-app-capable: `yes`
- apple-mobile-web-app-status-bar-style: `black-translucent`
- `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`
- `<html lang="fr">`

Manifest dans `public/manifest.json` :
```json
{
  "name": "Fête de la Musique Paris 2026",
  "short_name": "FdlM Paris",
  "start_url": "/",
  "display": "standalone",
  "lang": "fr-FR",
  "theme_color": "#FF6B6B",
  "background_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Crée des placeholders pour `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` dans `public/` (PNG vides 1px sont OK pour le MVP).

## Structure de fichiers

```
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  components/
    Header.tsx
    Map.tsx
    EventContent.tsx         # contenu partagé
    EventPanel.tsx           # wrapper sidebar desktop
    EventSheet.tsx           # wrapper vaul mobile
    UserLocation.tsx
    filters/
      FilterBar.tsx          # wrapper desktop
      FilterSheet.tsx        # wrapper bottom sheet mobile
      TimeFilter.tsx
      GenreFilter.tsx
      OutdoorFilter.tsx
      PriceFilter.tsx
      ResultCount.tsx
  data/
    mock-events.ts
    genres.ts
  hooks/
    useFilters.ts            # état des filtres + logique GeoJSON
    useUserLocation.ts
    useSliderTime.ts         # source de vérité de "l'heure courante"
  lib/
    utils.ts                 # cn() shadcn
    time.ts                  # helpers date/heure FR
    status.ts                # calcul statut event (utilise slider_time)
    geojson.ts               # transforme Event[] → FeatureCollection
  types/
    event.ts
```

## Variables d'environnement

`.env.local` :
```
NEXT_PUBLIC_MAP_STYLE_PRIMARY=https://tiles.stadiamaps.com/styles/stamen_watercolor.json
NEXT_PUBLIC_MAP_STYLE_FALLBACK=https://tiles.openfreemap.org/styles/liberty
```

## Installation initiale

À la fin, fournis les commandes shell exactes :

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --no-import-alias`
2. `npm install maplibre-gl react-map-gl vaul framer-motion date-fns lucide-react`
3. `npx shadcn@latest init`
4. `npx shadcn@latest add slider toggle-group button badge sheet sonner`
5. `npm run dev`

## Contraintes strictes

- **Pas d'auth, pas de DB, pas d'API backend** — tout en mock
- **Pas de tests** — c'est un MVP visuel
- **Pas de commentaires inutiles** — code clair, identifiants explicites
- **Pas de gestion d'erreur défensive** sauf à la frontière (géoloc, style fallback)
- **Pas de fichiers .md créés** sauf si explicitement demandé
- **Toujours préférer les composants shadcn existants** plutôt que d'en réécrire
- **Code en français pour les labels visibles, anglais pour les
  identifiants** (variables, fichiers, fonctions)

## Critère de succès

Après `npm run dev`, je dois :
1. Voir Paris en style aquarelle avec 50 points colorés
2. Voir des clusters denses autour de République, et un cluster qui
   éclate au zoom in
3. Pouvoir bouger le slider d'horaire et voir les points apparaître/disparaître
   instantanément (sans lag perceptible, < 50ms)
4. Pouvoir sélectionner plusieurs genres et voir l'effet OR (union, pas intersection)
5. Cliquer sur un point et voir le panel détail s'ouvrir
6. Voir que le statut "En cours / Bientôt / Terminé" change quand je
   déplace le slider
7. Cliquer sur "Ouvrir dans Google Maps" et voir le lien fonctionner
8. Tester sur mobile (responsive design) avec les bottom sheets fluides
9. Pouvoir installer l'app comme PWA depuis Chrome/Safari mobile
```
