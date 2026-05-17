# Analyse critique des décisions

Pour chaque point arbitré (référencé par son code dans [arbitrated-points.md](arbitrated-points.md)), mon opinion honnête + alternatives sérieuses + verdict.

**Échelle de confiance** :
- ⭐⭐⭐ choix solide, peu de regrets probables
- ⭐⭐ bon choix mais alternative légitime
- ⭐ choix par défaut, mérite réexamen post-POC

---

## 🔴 Architecture (irréversible avant 21 juin)

### A1 — Deux services Frontend/Backend séparés ⭐⭐

**Mon avis** : standard mais pas obligé.

**Alternative** : monolithe Next.js avec API routes pour l'ETL + Vercel Cron.
- ✅ Un seul deploy, types partagés automatiquement, simplicité
- ❌ Vercel Cron limité au free tier (jobs ≤ 10s sur le hobby), ETL lourd impossible
- ❌ Un bug dans l'ETL peut crasher le frontend (process partagé)

**Verdict** : 2 services est plus propre. Mais si tu veux raccourcir, **un seul Next.js avec un script ETL standalone dans `scripts/sync.ts`** déclenché par GitHub Actions cron est viable. Pas besoin d'un "backend" séparé, juste un script.

---

### A2 — PWA web (pas natif) ⭐⭐⭐

**Mon avis** : seul choix raisonnable vu le délai.

**Alternative** : Capacitor (wrap la PWA en app native iOS/Android).
- ✅ Présence dans les stores, vraies push notifications, accès caméra
- ❌ 1-2 semaines de setup + délai de validation App Store (5-10 jours)
- ❌ Refus App Store fréquent si l'app est "juste un wrapper web"

**Verdict** : PWA. Capacitor en v2 si tu veux la présence store une fois validé en 2026.

---

### A3 — ETL + DB locale (pas de proxy direct OpenAgenda) ⭐⭐⭐

**Mon avis** : pas négociable.

**Alternative** : MCP/proxy frontend → OpenAgenda direct.
- ✅ Toujours frais, pas de sync à gérer
- ❌ Rate limit OpenAgenda mort le 21 juin avec quelques utilisateurs concurrents
- ❌ App down si OpenAgenda tombe le jour J
- ❌ Aucune normalisation possible → filtres bruts

**Verdict** : validé sans réserve.

---

### A4 — Une ligne par timing ⭐⭐⭐

**Mon avis** : simplifie tout drastiquement.

**Alternative** : un event = une ligne avec `timings JSONB` array.
- ✅ Moins de doublons de title/description (~30% moins de stockage)
- ❌ Filtre horaire devient horrible : `WHERE timings @> '[{"begin": "..."}]'::jsonb` non indexable
- ❌ Pas d'index sur `start_time` possible

**Verdict** : une ligne par timing. Stockage non-problème vu le volume (5k lignes max).

---

### A5 — PostGIS pour les requêtes géo ⭐⭐

**Mon avis** : overkill mais quasi gratuit (Supabase l'inclut).

**Alternative** : lat/lng en `double precision` séparés + haversine en JS côté client.
- ✅ Marche sur n'importe quelle DB (pas que Postgres)
- ✅ Le frontend a déjà tous les events en mémoire pour la carte → filtre géo trivial en JS
- ❌ Pas de RPC `events_near` côté serveur (nécessaire pour le chatbot v2)
- ❌ Plus lent si on a > 5000 events (improbable ici)

**Verdict** : PostGIS si on garde Supabase (gratuit). Si on change pour Neon ou autre, lat/lng séparés sont suffisants. Pas une religion.

---

### A6 — GeoJSON natif MapLibre (pas de React markers) ⭐⭐⭐

**Mon avis** : critique pour la perf, surtout si volumes réels > attendus.

**Alternative** : `<Marker>` React (un composant par event).
- ✅ Customisation visuelle riche (vraies popups React, hover states complexes)
- ❌ Au-delà de 200 markers, le DOM rame visiblement
- ❌ Filtrage = re-render React = lag perceptible au slider

**Verdict** : GeoJSON natif. Mais ça implique d'accepter que les markers sont des cercles colorés simples (pas des icônes complexes).

---

## 🟡 Tech stack (révisable post-POC, 0.5-2 jours de rework)

### B1 — Supabase ⭐⭐

**Mon avis** : meilleur default, mais pas le seul choix raisonnable.

**Alternative 1 — Neon (Postgres) + Hono sur Cloudflare Workers** :
- ✅ Neon free tier ne s'endort jamais (vs Supabase qui pause après 7j d'inactivité)
- ✅ Workers gratuits jusqu'à 100k req/jour, latence Cloudflare excellente
- ❌ Plus de setup : 2 services à configurer au lieu d'un

**Alternative 2 — Self-hosted Postgres + PostgREST sur VPS 5€/mois** :
- ✅ Contrôle total, scalable
- ❌ Maintenance (TLS, backup, updates)
- ❌ Latence dépend du VPS

**Alternative 3 — SQLite + Turso (libsql edge)** :
- ✅ Réplication edge, free tier énorme
- ❌ Pas de PostGIS (faut faire haversine en SQL)

**Verdict** : Supabase pour le confort, mais l'agent ETL doit valider que le free tier ne pause pas pendant ses tests. Si oui → Neon.

---

### B2 — MapLibre GL JS (pas Leaflet) ⭐⭐⭐

**Mon avis** : nécessaire pour Stamen Watercolor en vectoriel + perf.

**Alternative — Leaflet + tuiles raster Stamen** :
- ✅ Bundle 6x plus petit (40KB vs 250KB)
- ✅ API plus simple, plus de plugins
- ❌ Pas de filter natif côté GPU — filtrage en JS, plus lent
- ❌ Style raster figé (pas de personnalisation du look)

**Verdict** : MapLibre si on garde Watercolor en vectoriel et qu'on prévoit > 200 events. Sinon Leaflet est plus simple.

---

### B3 — Tailwind v4 + shadcn ⭐⭐

**Mon avis** : choix sûr mais Tailwind v4 récent (early 2025) — risque mineur de bugs.

**Alternative — Tailwind v3 + shadcn** :
- ✅ Battle-tested, écosystème mature
- ❌ Pas de CSS-only theming (v4 a `@theme` natif)

**Alternative — Mantine ou Chakra UI** :
- ✅ Composants plus riches out of the box
- ❌ Bundle plus gros, moins customisable

**Verdict** : si tu rencontres un bug Tailwind v4 bloquant, downgrade en v3 immédiatement (changement de package.json, pas de rewrite).

---

### B4 — TypeScript pour l'ETL ⭐⭐

**Mon avis** : bon pour la cohérence, pas optimal pour la nature data du job.

**Alternative — Python + pandas** :
- ✅ Pandas est imbattable pour de la manipulation de données
- ✅ Bibliothèques de regex et de NLP plus mûres
- ❌ Pas de partage de types avec le frontend
- ❌ Setup d'un second runtime (Python venv, requirements.txt)

**Verdict** : TS pour ce volume. Si tu fais des features data-heavy en v2 (analyse de tendances, prédictions), Python s'imposera.

---

### B5 — JSON statique vs DB Postgres ⭐⭐⭐ **Décision tranchée : JSON-first**

**Décision** : MVP en **JSON statique pur**. Pas d'hybride DB+JSON (YAGNI).

**Pourquoi tranché en faveur du JSON** :
- ✅ Zéro backend, zéro coût, zéro maintenance, zéro panne le 21 juin
- ✅ CDN edge Vercel → latence < 50ms partout
- ✅ Pas de rate limit, scale infini
- ✅ Le frontend charge tout au démarrage (~80KB gzippé pour 500 events) et filtre côté client via MapLibre — comportement **déjà** prévu
- ✅ Updates par GitHub Actions cron qui regen + commit le JSON → trigger redeploy Vercel auto
- ✅ La carte fait **tout son filtrage côté client** (MapLibre setFilter), une DB n'apporte rien

**Cascade induite** (voir [arbitrated-points.md](arbitrated-points.md)) :
- A1 → 1 seul projet Next.js (pas 2 services)
- A5 → PostGIS inutile
- C7 → TanStack Query inutile (un fetch au mount suffit)

**Quand basculer en DB** (décision documentée le moment venu) :
- Phase 2 chatbot Mistral : besoin de requêtes complexes server-side
- OU volume > 5000 events (mesuré par recon)
- OU JSON gzippé > 500KB (impacte first paint mobile)

**Pourquoi pas l'hybride DB+JSON pour le MVP** : maintenir 2 chemins = over-engineering. On ajoute la DB **quand** elle servira, modélisée pour ses vraies requêtes (et non spéculée).

---

### B6 — Stamen Watercolor (Stadia) ⭐⭐

**Mon avis** : pari esthétique fort, à tester sur de vrais utilisateurs.

**Plan B principal — OpenFreeMap Liberty** (pas un simple fallback, un vrai choix alternatif) :
- ✅ Zéro clé, zéro compte, zéro limite
- ✅ Indépendance complète : pas de risque que Stadia rate-limit ou tombe le 21 juin sous un pic de trafic viral
- ✅ Auto-hébergeable si besoin
- ❌ Look moderne propre, moins distinctif que Watercolor

**Risque Stadia le 21 juin** : free tier à 200k crédits/mois. Sur un événement parisien viral, ça peut piquer en une soirée (chaque tuile vectorielle = 1 crédit, plusieurs centaines de tuiles par session utilisateur).

**Autres alternatives esthétiques** :
- **Stamen Toner** (Stadia) : B&W graphique, marqueurs colorés pop dessus
- **MapTiler Pastel** : doux pastel — mais free tier limité à 5000 sessions/mois
- **Style custom** : éditer un JSON style MapLibre via Maputnik sur base OpenFreeMap

**Verdict** : décide selon priorité.
- Priorité **esthétique** : Stadia Watercolor (le plus distinctif), OpenFreeMap en fallback runtime au cas où
- Priorité **robustesse jour J** : OpenFreeMap Liberty d'office, Stadia en option pour les autres jours

Le frontend doit **dans tous les cas** tester l'URL primaire et fallback automatique sur OpenFreeMap si erreur de chargement.

**À tester impérativement avant le 21 juin** : Watercolor sur mobile en plein soleil (faible contraste possible). Si problème → bascule définitive sur OpenFreeMap ou Toner.

---

## 🟢 Détails (changement de config, à valider à l'usage)

### C1 — Vocabulaire genres ⭐⭐⭐ après recon

**Mon avis** : impossible à trancher sans le recon. Faire le recon = trancher.

**Pas d'alternative** : c'est purement empirique.

**Verdict** : laisser l'agent ETL décider à partir des données 2025. Ne pas débattre dans le vide.

---

### C2 — Filtre `is_outdoor` ⭐⭐

**Mon avis** : à 50/50 que le filtre survive au recon (taux de NULL probablement élevé).

**Alternative si NULL > 30%** : retirer le filtre, ne garder que `🌳 Plein air` comme **badge informatif** sur les events où c'est connu, sans filtre actif.

**Verdict** : décider après recon. Garder la colonne en DB dans tous les cas (gratuit), retirer juste le filtre UI si bruité.

---

### C3 — Filtre prix (3 états, comportement `unknown`) ⭐⭐

**Mon avis** : utile mais le comportement de `unknown` est subtil.

**Alternative** : toggle binaire "Cacher les payants" qui ferait `unknown ∪ free ∪ prix_libre`. Plus tolérant.

**Verdict** : commencer en 3 états, basculer en binaire si `unknown` > 40%.

---

### C4 — Pulse limité à N=5 events imminents ⭐⭐⭐

**Mon avis** : évite la saturation visuelle.

**Alternative** : pulse sur **tous** les events qui démarrent dans l'heure (peut faire 50+ pulses en simultané à 19h sur la carte).

**Verdict** : N=5 est bon. Augmenter à 10 si on a un cas où l'user clique sur le pulse pour voir ce qui démarre.

---

### C5 — 50 mock events avec zone dense République ⭐⭐⭐

**Mon avis** : assez pour tester clustering + perf sans devenir pénible.

**Alternative** : générer 200+ events programmatiquement avec un faker.
- ✅ Stress test plus réaliste
- ❌ Plus difficile à debugger (events random vs events choisis pour leurs cas spécifiques)

**Verdict** : 50 events main-craftés pour le POC. Si on veut stress-tester, l'agent ETL peut produire un `events.json` 2025 avec ~1000 events vrais.

---

### C6 — vaul pour bottom sheet ⭐⭐⭐

**Mon avis** : meilleur de la catégorie en React.

**Alternatives** : `@radix-ui/react-dialog` (manuel), `react-spring-bottom-sheet` (vieillit).

**Verdict** : vaul sans hésiter.

---

### C7 — TanStack Query avec `staleTime: Infinity` ⭐⭐

**Mon avis** : utile uniquement si on est sur DB. Si on choisit JSON statique (B5), c'est inutile.

**Alternative — fetch direct + cache manuel via `useState`** :
- ✅ Pas de dépendance, plus simple
- ❌ Pas de retry automatique, pas de dedup des requêtes

**Verdict** : si DB → TanStack Query. Si JSON statique → un `fetch` au mount suffit.

---

### C8 — Heure courante = slider, pas system clock ⭐⭐⭐

**Mon avis** : cohérence UX critique.

**Alternative** : dual time, le slider est juste un filtre temporel et l'horloge système drive le statut event.
- ❌ Casse l'UX : à 14h on voit la programmation 22h, tous les events "Terminé" 🤷

**Verdict** : validé sans réserve.

---

### C9 — Mistral phase 2 uniquement ⭐⭐⭐

**Mon avis** : éviter la complexité IA tant que la base n'est pas stable.

**Alternative** : Mistral dans l'ETL pour normaliser les tags ambigus.
- ✅ Catch les tags non mappés automatiquement
- ❌ Latence + coût par sync, complexité de gestion d'erreur IA

**Verdict** : mapping statique pour le MVP. L'agent ETL log les tags non mappés → on enrichit manuellement → re-sync.

---

### C10 — Cron daily puis hourly en J-7 ⭐⭐⭐

**Mon avis** : équilibre fraîcheur/respect d'OpenAgenda.

**Alternative** : hourly tout le temps.
- ❌ Inutile en avril 2026, gaspille les appels API

**Verdict** : validé.

---

## Synthèse — points qui méritent vraiment ton attention

Si tu ne dois revisiter que **3 choses** avant le POC :

1. **B5 — DB vs JSON statique**. Le MVP carte n'a pas besoin de DB. C'est l'optimisation la plus violente possible (suppression du backend entier). Demande à l'agent ETL d'évaluer sérieusement, pas juste de partir sur Supabase par réflexe.

2. **B6 — Stamen Watercolor sur mobile en plein soleil**. Test à faire avant de graver. Plan B = Toner ou Liberty.

3. **C2 — `is_outdoor`**. Probabilité non négligeable qu'il faille le retirer du MVP. Garder la colonne en DB, retirer juste le filtre UI selon recon.

Tout le reste est solide ou facilement réversible.
