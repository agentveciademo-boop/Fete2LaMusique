# Prompt — Frontend : header chips date + slider soirée

À exécuter dans `/Users/tanguy/dev/projets/Fete2LaMusique/`.

**Lecture obligatoire avant de coder** :
- `CLAUDE.md`
- `docs/design-decisions.md`
- `docs/prompts/frontend-mvp.md` (toujours valide pour le reste)
- `src/types/event.ts`
- `src/hooks/useFilters.ts`
- Tout `src/components/filters/`
- `src/components/EventPanel.tsx`, `src/components/EventSheet.tsx`
- `src/app/page.tsx`

---

```
Tu fais évoluer l'UI filtres date + heure de l'app PWA carte. Le MVP
actuel a un filtre date dans la `FilterSheet` et un filtre horaire dans
la `FilterBar`. La nouvelle UX consolide ces deux dimensions
différemment et adopte une sémantique « soirée ».

## Concept clé : `session_date`

Un concert qui démarre samedi 23h et finit dimanche 02h appartient à la
**soirée du samedi**, pas du dimanche. Le champ `session_date` (string
`YYYY-MM-DD`) sera fourni par l'ETL ; en attendant tu le dérives côté
frontend depuis `start_time` :

  - heure locale ∈ [14h, 23h59] → session_date = ce jour
  - heure locale ∈ [00h, 06h]   → session_date = ce jour - 1
  - heure locale ∈ [06h, 14h]   → session_date = ce jour (rare)

Mets cette fonction dans `src/lib/session.ts` avec des tests dédiés.

## Nouveau layout (mobile-first)

    ┌─────────────────────────────┐
    │ ≡   Sam 20   Dim 21   Tout  │ ← header (~50px), sticky top
    │                ━━━━━         │   underline 2px sur l'actif
    ├─────────────────────────────┤
    │                             │
    │            🗺️                │
    │        CARTE (filtrée)      │ ← max espace
    │                             │
    │  [345 events] [Filtres ▾]   │
    │                             │
    ├─────────────────────────────┤
    │ 🕓 19h ●━━━━○━━ 02h         │
    │  14h   18h   22h   02h  06h │ ← sticky bottom (~60px)
    └─────────────────────────────┘

Le titre « Fête de la Musique 2026 » disparaît du header (implicite —
toute l'app *est* la Fête de la Musique). Garde l'icône ≡ pour un futur
menu (about, attribution ODbL, etc.).

## Implémentation

### 1. Header avec chips date

Crée `src/components/DateTabs.tsx` :
- Trois tabs : `Sam 20` · `Dim 21` · `Tout`
- Un seul actif à la fois, underline 2px en bas de l'actif (Tailwind
  border + transition)
- Hauteur 50px, sticky top, fond opaque (la carte ne doit pas se voir
  dessous quand on scroll)
- Composant shadcn `Tabs` re-stylé pour ressembler à des onglets
  minimaux, PAS à des boutons remplis
- Source de vérité des dates : constante
      FESTIVAL_DAYS = ['2026-06-20', '2026-06-21'] as const
  dans `src/lib/festival.ts`

Intègre dans `src/app/layout.tsx` au-dessus du `<main>`.

### 2. Slider temps sticky

Crée `src/components/filters/TimeRangeSlider.tsx` :
- Range slider à 2 poignées (shadcn `Slider` en mode 2 valeurs)
- Axe domaine `[14, 30]` (où 30 = 06h le lendemain matin)
- Affichage des valeurs poignées : `(value % 24).toString().padStart(2, '0') + 'h'`
- Ticks visibles sous l'axe : `14h · 18h · 22h · 02h · 06h`
- Sticky bottom, fond opaque, hauteur ~60px
- Touch-friendly : poignées 24x24px, hit area 44x44px
- Debounce 100ms avant d'appeler le callback de filtre

Couleur de fond du track : dégradé subtil bleu→indigo pour suggérer la
soirée → nuit. Pas trop kitsch.

### 3. Mise à jour de `useFilters.ts`

Remplace les filtres date/horaire actuels par :

    type Filters = {
      sessionDate: '2026-06-20' | '2026-06-21' | null  // null = Tout
      timeRange: [number, number]                       // sur axe 14-30
      // ... autres filtres existants conservés
    }

Defaults :
- `sessionDate = '2026-06-21'`
- `timeRange = [18, 23]`
- **Smart default** : si `Date.now()` est entre 2026-06-20T14:00 et
  2026-06-22T06:00 Europe/Paris, ancre `timeRange[0]` sur l'heure courante
  arrondie à l'heure pleine (`Math.floor(hour + dayOffset)` avec
  conversion vers axe 14-30)

Un event est inclus ssi :
  1. `event.session_date === filters.sessionDate` (ou sessionDate null)
  2. ET l'intervalle horaire de l'event chevauche `filters.timeRange`
     dans l'axe 14-30

Pour le 2., convertis `start_time` et `end_time` en valeurs sur l'axe
14-30 en utilisant `session_date` comme ancre (un event de la soirée du
20 démarrant à 23h vaut `23`, finissant à 02h vaut `26`).

### 4. Nettoyage

- Retire le filtre date de `FilterSheet`
- Retire le filtre horaire de `FilterBar`
- `FilterSheet` garde : genres, outdoor (selon recon), autres filtres
  existants
- `FilterBar` devient un bouton « Filtres ▾ » qui ouvre la sheet, +
  le compteur d'events. Plus rien d'autre.

### 5. Tests

`src/lib/session.test.ts` :
- `getSessionDate('2026-06-21T23:30:00+02:00')` === `'2026-06-21'`
- `getSessionDate('2026-06-22T02:15:00+02:00')` === `'2026-06-21'`
- `getSessionDate('2026-06-22T08:00:00+02:00')` === `'2026-06-22'`
- `getSessionDate('2026-06-21T15:00:00+02:00')` === `'2026-06-21'`

`src/hooks/useFilters.test.ts` :
- event 23h30 sam → matched par sessionDate=20 ET timeRange=[22, 25]
- event 23h30 sam → NOT matched par sessionDate=21
- event 14h dim → matched par sessionDate=21 ET timeRange=[14, 18]

### 6. Vérification visuelle

- `npm run dev`, ouvrir sur DevTools mobile (iPhone 12 / 375px)
- Vérifier : header sticky en haut, slider sticky en bas, carte au milieu,
  les deux toujours visibles pendant le pan/zoom
- Tester chaque chip date, chaque range du slider, combinaison des deux
- Tester le smart default (mock `Date.now()` à 2026-06-21T20:00 si besoin)

## Conventions

- TypeScript strict, pas de `any`
- Continuer à utiliser `src/data/mock-events.ts` pour le dev
- Ajouter le chargement de `/data/events.json` s'il existe (fallback sur
  les mocks sinon) — patron :
      const events = await fetch('/data/events.json').then(r =>
        r.ok ? r.json().then(d => d.events) : MOCK_EVENTS
      )
- Lancer `npm test` et `npm run lint` avant de finir
- Pas de nouvelle dépendance lourde — `shadcn/ui` `Slider` et `Tabs`
  suffisent
```
