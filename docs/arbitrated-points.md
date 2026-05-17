# Points arbitrés

Inventaire des décisions de planification, classées par **coût de retour en arrière** après le POC.

**Légende :**
- 🔴 **Difficile** — réviser coûterait > 2 jours de rework ou impacte des dépendances en cascade. À valider **maintenant**, avant le POC.
- 🟡 **Moyenne** — réviser coûte 0.5-2 jours. Possible après le POC mais à anticiper.
- 🟢 **Facile** — réviser = changer un fichier de config, un mapping, ou une lib. Faire tourner le POC d'abord, on tranchera ensuite.

À relire **point par point** après le POC pour valider ou réviser.

## ⚠️ Couplages entre décisions

Certains points ne sont pas indépendants. Si on bascule l'un, plusieurs autres changent automatiquement.

**Décision pivot : B5 — JSON statique vs DB**

Le projet est désormais en **JSON-first** par défaut (voir [decisions-analysis.md](decisions-analysis.md) B5). Cascade induite :

| Si on confirme JSON statique (default actuel) | Impact sur autres décisions |
|----------------------------------------------|---------------------------|
| **A1** (2 services séparés) | Devient **1 seul service Next.js** avec `etl/sync.ts` standalone. Coût retour A1 → 🟢 (était 🔴) |
| **A5** (PostGIS) | Inutile au MVP. Coût retour A5 → 🟢 |
| **C7** (TanStack Query) | Inutile, un seul `fetch` au mount suffit. Coût retour C7 → 🟢 |
| **A6** (GeoJSON natif MapLibre) | Reste vrai, même plus naturel (le JSON est ~directement convertible) |

Si on rebascule en DB plus tard (chatbot v2), A1/A5/C7 redeviennent pertinents — coût rework estimé 2 jours.

**Lecture importante** : ne pas considérer les classifications 🔴/🟡/🟢 ci-dessous comme indépendantes. Le `🔴` de A1 est conditionné par B5 — il devient `🟢` si JSON statique reste le choix.

---

## 🔴 Difficile à revenir en arrière — à valider MAINTENANT

### A1. Architecture en deux services (Frontend ↔ Backend séparés)

**Décision** : Next.js frontend + ETL backend découplés, joints par contrat REST.
**Coût retour** : ~3 jours de rework (réunir en monolithe, redécouper le routing, perdre l'indépendance de déploiement).
**Pourquoi quand même OK** : standard de l'industrie, permet le dev parallèle frontend/ETL.
**Statut** : ✅ validé

### A2. PWA web plutôt qu'app native

**Décision** : Next.js + manifest PWA, déploiement Vercel.
**Coût retour** : ~2-3 semaines (réécrire en React Native ou Flutter, soumettre aux stores).
**Pourquoi quand même OK** : deadline 21 juin, PWA installable iOS/Android, pas de validation store.
**Risque résiduel** : iOS limite certaines features PWA (push, background sync). Acceptable pour le MVP qui est en lecture seule.
**Statut** : ✅ validé — irréversible avant le 21 juin

### A3. ETL périodique + DB locale, pas de proxy direct OpenAgenda

**Décision** : sync OpenAgenda → notre DB, le frontend ne tape jamais OpenAgenda.
**Coût retour** : ~2 jours (réécrire les requêtes frontend, gérer rate limits côté client).
**Pourquoi quand même OK** : protection contre rate limits, normalisation des genres, robustesse si OpenAgenda tombe.
**Statut** : ✅ validé

### A4. Schéma "une ligne par timing" (multi-timing splittés)

**Décision** : un event OpenAgenda avec 3 timings = 3 lignes en DB, clé `(openagenda_uid, timing_index)`.
**Coût retour** : ~1 jour (refonte requêtes, dédup côté UI).
**Alternative** : une ligne par event, timings en JSON array. Plus compact mais requêtes temporelles complexes.
**Statut** : ✅ validé — facilite massivement le filtre horaire

### A5. PostGIS pour les requêtes géo

**Décision** : colonne `geometry(Point, 4326)`, index GIST, RPC `events_near`.
**Coût retour** : ~1 jour (migration vers lat/lng séparés, requêtes géo en JS côté client).
**Pourquoi quand même OK** : trivialise "events dans un rayon de 500m", performance.
**Contrainte** : impose un backend Postgres (pas DynamoDB, pas Firestore). Cohérent avec Supabase recommandé.
**Statut** : ✅ validé

### A6. Rendu marqueurs via source GeoJSON natif MapLibre

**Décision** : un seul layer MapLibre avec tous les events, pas de composants React par marker.
**Coût retour** : ~2 jours (réécrire avec react-map-gl `<Marker>`, perdre les perfs à 500+ events).
**Pourquoi quand même OK** : prépare le scaling à 500+ events sans refactor, clustering natif.
**Statut** : ✅ validé

---

## 🟡 Moyennement réversible — possible après POC, à anticiper

### B1. Choix de Supabase comme backend

**Décision** : Supabase recommandé, à confirmer par l'agent ETL (peut proposer Neon, Railway, self-hosted).
**Coût retour** : 1-2 jours (migration de provider Postgres). Les données et le schéma sont portables.
**Quand revisiter** : si Supabase free tier limite trop, ou si Edge Functions trop contraignantes.
**Statut** : ⏳ à confirmer par l'agent ETL

### B2. MapLibre GL JS plutôt que Leaflet

**Décision** : MapLibre pour WebGL, styles vectoriels, performance.
**Coût retour** : 1.5 jours (réécrire la carte en Leaflet, perdre Stamen Watercolor en vectoriel).
**Quand revisiter** : si MapLibre s'avère trop lourd ou si on n'a pas besoin de 1000+ markers.
**Statut** : ✅ validé pour le POC, réversible après

### B3. Stack Tailwind v4 + shadcn

**Décision** : Tailwind v4 + shadcn pour composants.
**Coût retour** : 2 jours (migration vers CSS Modules ou autre lib UI).
**Quand revisiter** : si Tailwind v4 a des bugs bloquants (sortie récente).
**Statut** : ✅ validé

### B4. TypeScript pour l'ETL (pas Python)

**Décision** : TypeScript pour cohérence stack.
**Coût retour** : 1 jour (réécrire en Python, perdre les types partagés avec le frontend).
**Quand revisiter** : si la normalisation devient complexe et qu'on veut pandas/scikit.
**Statut** : ✅ validé pour le MVP

### B5. Données ingérées dans une DB, pas un fichier statique

**Décision** : Postgres avec sync périodique.
**Alternative envisageable post-POC** : générer un `events.json` statique mis à jour par cron, servi depuis CDN.
**Coût retour** : ~1 jour vers le statique (perd PostGIS, gagne en simplicité et coût zéro).
**Quand revisiter** : si le volume final < 2000 events et qu'on n'a pas besoin de requêtes serveur.
**Statut** : ✅ validé, mais B5-alt est sérieusement à considérer pour la v2 si volumes faibles

### B6. Stamen Watercolor (Stadia Maps) comme style de carte

**Décision** : choix esthétique fort.
**Coût retour** : 0.5 jour (changer URL de style).
**Quand revisiter** : si les retours utilisateurs trouvent le style illisible sur mobile en plein soleil.
**Statut** : ✅ validé pour le POC, à tester sur des utilisateurs

---

## 🟢 Facilement réversible — décider à l'aune du POC

### C1. Vocabulaire genres (9, 13, ou autre)

**Décision actuelle** : provisionnel, à trancher par recon OpenAgenda 2025.
**Coût retour** : 30 min (édition `genre-mapping.json` + `src/data/genres.ts`).
**Quand revisiter** : après recon, après lancement, à chaque saison.
**Statut** : ⏳ PENDING RECON

### C2. Filtre `is_outdoor` gardé ou retiré

**Décision actuelle** : gardé si NULL < 30% sur recon 2025.
**Coût retour** : 1h (retirer composant + colonne, ou inversement).
**Quand revisiter** : après recon, et après J+1 (qualité réelle sur 2026).
**Statut** : ⏳ PENDING RECON

### C3. Filtre prix : 3 états, comportement de `unknown`

**Décision actuelle** : Tout / Gratuit / Prix libre inclus. `unknown` visible sauf si filtre actif.
**Coût retour** : 30 min.
**Statut** : ✅ validé, à confirmer après recon

### C4. Animation pulse limitée à N=5 events imminents

**Décision** : pas tous les events à la fois (saturation visuelle).
**Coût retour** : 15 min (changer la constante N).
**Statut** : ✅ validé

### C5. 50 mock events avec zone dense République

**Décision** : assez pour tester clustering sans devenir pénible.
**Coût retour** : aucun (mock data).
**Statut** : ✅ validé

### C6. vaul pour bottom sheet mobile

**Décision** : lib mature et accessible.
**Coût retour** : 0.5 jour (swap lib).
**Statut** : ✅ validé

### C7. TanStack Query avec `staleTime: Infinity`

**Décision** : les données ne bougent pas le 21 juin.
**Coût retour** : 1h (retirer ou changer config).
**Statut** : ✅ validé

### C8. "Heure courante" pour le statut event = heure du slider

**Décision** : cohérence UX, le slider drive aussi le statut "En cours / Terminé".
**Coût retour** : 15 min.
**Statut** : ✅ validé

### C9. Mistral uniquement en phase 2 (chatbot), pas dans l'ETL

**Décision** : normalisation par mapping statique au MVP.
**Coût retour** : 0.5 jour pour ajouter un fallback Mistral dans l'ETL si besoin.
**Quand revisiter** : si après recon le taux de tags non mappés est > 15%.
**Statut** : ✅ validé pour MVP

### C10. Cron : daily puis hourly en J-7

**Décision** : minimiser les requêtes OpenAgenda hors période critique.
**Coût retour** : changement de config cron.
**Statut** : ✅ validé

---

## Points à valider après le POC

À chaque ligne, après le POC, marquer :
- ✅ confirmé tel quel
- 🔄 à réviser → nouvelle décision
- ❌ abandonné

| Point | Catégorie | Décision actuelle | Statut post-POC |
|-------|-----------|------------------|-----------------|
| A1 | 🔴 | 2 services | [ ] |
| A2 | 🔴 | PWA web | [ ] |
| A3 | 🔴 | ETL + DB locale | [ ] |
| A4 | 🔴 | Une ligne / timing | [ ] |
| A5 | 🔴 | PostGIS | [ ] |
| A6 | 🔴 | GeoJSON natif | [ ] |
| B1 | 🟡 | Supabase | [ ] |
| B2 | 🟡 | MapLibre | [ ] |
| B3 | 🟡 | Tailwind v4 + shadcn | [ ] |
| B4 | 🟡 | TypeScript ETL | [ ] |
| B5 | 🟡 | DB vs statique | [ ] |
| B6 | 🟡 | Stamen Watercolor | [ ] |
| C1 | 🟢 | Vocab genres | [ ] |
| C2 | 🟢 | is_outdoor | [ ] |
| C3 | 🟢 | Filtre prix | [ ] |
| C4 | 🟢 | Pulse N=5 | [ ] |
| C5 | 🟢 | 50 mocks | [ ] |
| C6 | 🟢 | vaul | [ ] |
| C7 | 🟢 | TanStack Query | [ ] |
| C8 | 🟢 | Heure = slider | [ ] |
| C9 | 🟢 | Mistral phase 2 | [ ] |
| C10 | 🟢 | Cron daily/hourly | [ ] |

---

## Méta : quand revisiter ce document ?

- **Après le POC frontend** (carte + filtres avec mock) : valider C1-C10 + B2, B6
- **Après le recon ETL** : valider C1, C2, C9, B1
- **Après le premier sync réel sur 2026** : valider C3
- **Après 24h de production** (22 juin 2026 matin) : tout le doc
