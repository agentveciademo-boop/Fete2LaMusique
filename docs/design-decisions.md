# Décisions de design

Ce document consigne les décisions de produit et leur rationale. Pour la classification par **coût de retour en arrière**, voir [arbitrated-points.md](arbitrated-points.md).

## Filtres conservés

### 1. Filtre horaire (slider)

- Slider de 12h00 (J) à 02h00 (J+1)
- Pas de 15 minutes
- Bouton "Maintenant" qui repositionne sur l'heure courante système
- Format affiché : `19h15` (français)
- **Logique** : afficher les events où `start_time ≤ heure_selectionnee ≤ end_time`
- **Cas edge** : event sans `end_time` → afficher si `start_time` dans les 3h suivantes
- **Cas edge** : rollover minuit → représenter en interne comme `Date` complète, pas heure isolée

### Heure courante = heure du slider (pas l'horloge système)

Décision clé : le **statut affiché dans le panel détail** (🟢 En cours / 🔜 Dans 1h30 / ✅ Terminé) est calculé par rapport à **l'heure du slider**, pas l'horloge système.

**Pourquoi** : si l'user déplace le slider à 22h pour explorer ce qui joue à 22h, le statut doit refléter ce moment. Sinon, à 14h en après-midi, tous les events apparaissent "✅ Terminé" même si on explore la programmation future.

**Bouton "Maintenant"** : reset le slider sur `new Date()` système. C'est l'unique pont entre le temps réel et le slider.

### 2. Filtre genre (chips multi-select)

- Max ~8-9 genres principaux + chip "Autres"
- Chaque chip a : couleur, icône emoji, label
- Multi-select : aucun coché = tout affiché
- **Sémantique : OR** — un event apparaît si au moins un de ses genres est sélectionné. Côté requête : `.overlaps('genres', selectedGenres)` (PAS `.contains()`)
- Affichage en scroll horizontal sur mobile

**Genres affichés (provisionnel, à confirmer après recon)** :

- 🎷 Jazz (#F59E0B)
- 🎸 Rock (#EF4444)
- 🎹 Classique (#8B5CF6)
- 🎧 Electro (#06B6D4)
- 🪕 Folk (#10B981)
- 🎤 Rap (#F97316)
- 🎵 Variété (#EC4899)
- 🌍 World (#14B8A6)
- ❓ Autres (#6B7280)

> **⚠️ PENDING RECON** — Le vocabulaire final dépend du recon OpenAgenda 2025. Ajouts probables : `fanfare`, `chorale`, `soul/funk`, `trad`. Si un genre représente ≥ 3% du volume réel, il mérite son chip.

### Multi-genre dans les events

Un event en DB peut avoir plusieurs genres : `['jazz', 'rock']`. Côté affichage :

- **Couleur du marqueur** : premier genre du tableau (`genres[0]`)
- **Badges dans le panel détail** : tous les genres affichés
- **Filtrage MapLibre** : expression `["any", ["in", "jazz", ["get", "genres"]], ["in", "rock", ["get", "genres"]]]` ou équivalent — les arrays sont préservés dans les properties GeoJSON (pas de vector tiles)
- **Mock data** : ~30% des events ont 2 genres, ~5% ont 3

### 3. Filtre Lieu (plein air / salle)

Toggle à 3 états : `Tout` / `Plein air` / `En salle`.

**Inféré dans l'ETL** depuis :

- Heuristiques regex sur le venue name (rue, place, parc, jardin, square, esplanade, quai → outdoor)
- Heuristiques regex sur le venue name (salle, théâtre, conservatoire, bar, café, club, auditorium, église → indoor)
- `attendanceMode` OpenAgenda ne distingue **pas** outdoor/indoor (juste online/offline) — pas utilisable seul
- Si indéterminé : `is_outdoor = NULL`

**Comportement UI** :
- Filtre = `Tout` : tous events affichés
- Filtre = `Plein air` : seulement `is_outdoor === true` (les NULL sont masqués)
- Filtre = `En salle` : seulement `is_outdoor === false` (les NULL sont masqués)

> **⚠️ PENDING RECON** — Si le taux de `NULL` sur l'agenda 2025 est ≥ 30%, retirer ce filtre du MVP (les utilisateurs verraient ~1/3 des events disparaître inutilement).

### 4. Filtre prix

Toggle à 3 états : `Tout` / `Gratuit` / `Inclut prix libre`.

**Inféré dans l'ETL** depuis le champ `conditions` (regex case-insensitive) :

- Contient `gratuit|free|entrée libre` → `price_type = 'free'`
- Contient `prix libre|au chapeau|donation` → `price_type = 'prix_libre'`
- Contient `€|euros?|payant|tarif` → `price_type = 'paid'`
- Vide ou aucun match → `price_type = 'unknown'`

**Comportement UI** :
- Filtre = `Tout` : tous events affichés (y compris `unknown`)
- Filtre = `Gratuit` : `price_type === 'free'`
- Filtre = `Inclut prix libre` : `price_type IN ('free', 'prix_libre')`
- **Pas d'option "Payant uniquement"** — hors esprit de la Fête de la Musique, ajoutable si demande utilisateur

> **⚠️ PENDING RECON** — Si `unknown` ≥ 40% sur l'agenda 2025, le filtre risque d'être trop bruité. Envisager dans ce cas un toggle binaire "Afficher payants ✓/✗" plus tolérant.

## Filtres écartés

### Filtre `size` (small/medium/large)

**Pourquoi écarté** : OpenAgenda ne fournit pas cette info. Inférer à partir d'une description est très peu fiable. Crée de la fausse confiance pour l'user (un event "petit" pourrait être en réalité une grande scène).

### Filtre `ambiance` à 4 valeurs

**Pourquoi remplacé** : "rue / bar / scène / festival" demandait une classification IA peu fiable. ~30-40% d'events finiraient en "autre". Remplacé par le binaire `is_outdoor` qui est inférable.

### Filtre arrondissement

**Pourquoi écarté du MVP** : redondant avec le pan/zoom de la carte. À reconsidérer pour le chatbot v2 ("jazz dans le 11e").

## Décisions techniques rendues

### Rendu des marqueurs : GeoJSON natif, pas React markers

Avec 500+ events, des composants React individuels coûtent cher. On utilise une source GeoJSON unique dans MapLibre + un layer `circle`. Le filtrage se fait via `map.setFilter(...)` côté GPU, sans re-render React.

### Clustering : natif MapLibre

`cluster: true` dans la source GeoJSON. Pas besoin de supercluster en lib séparée — MapLibre l'intègre nativement.

### Bottom sheet : vaul

Lib React maintenue, smooth, draggable, accessible. Utilisée par shadcn. Évite de réinventer la roue.

### Style carte : Stamen Watercolor (Stadia Maps)

Choix esthétique fort, identité visuelle marquée pour une app événementielle. Fallback OpenFreeMap Liberty si Stadia indispo.

### Pas d'auth pour le MVP

L'app est en lecture seule. Pas de comptes, pas de favoris persistés en DB. Si on veut des favoris : `localStorage` côté client suffit.

## Décisions ouvertes (à trancher plus tard)

- **Notifications push** : utile pour rappeler un event qu'on a "favorisé" 30 min avant — coûteux en complexité PWA, à voir si nécessaire
- **Mode AR / Compass** : "tourne-toi vers le concert" — gadget, hors MVP
- **Partage social** : lien direct vers un event (`/event/[id]`) — facile à ajouter, à prévoir dans le routing
- **Multi-jours** : la Fête se déroule sur 1 soir mais certaines villes étendent — pour 2026 on reste sur le 21 juin uniquement

## Backlog d'analyse post-POC

Items à investiguer pendant ou après le développement, pas bloquants pour le POC :

### Qualité de `is_outdoor` dans les données OpenAgenda

**Hypothèse à vérifier** : l'info plein air/salle n'est pas toujours fiable dans les données OpenAgenda. Certains organisateurs renseignent mal le venue name, d'autres mettent des termes ambigus ("scène", "espace", "lieu...").

**À mesurer pendant le développement** :
- Après le recon : taux de NULL réel
- Sur un échantillon manuel de 30-50 events : taux de **faux positifs** (event classé "plein air" mais en réalité indoor, ou inverse) — les regex sont naïves
- Si possible : ratio events "rue/plein air" vs "salle" dans la réalité de la Fête (intuition : majorité plein air, donc un événement mal classé indoor disparaît du filtre par défaut "plein air")

**Décision à prendre** :
- Si qualité bonne (NULL bas + faux positifs bas) : filtre 3-états classique
- Si qualité moyenne : ajouter une note de transparence dans l'UI ("X events masqués sans info")
- Si qualité mauvaise : retirer le filtre, garder uniquement le **badge** dans le panel détail (toujours utile : "Lieu : 🌳 Plein air confirmé" quand connu)

**Pourquoi en backlog et pas trancher maintenant** : la décision dépend de données qu'on n'a pas encore. Le champ `is_outdoor` est dans le JSON quoi qu'il arrive, donc l'ajout/retrait du filtre UI est trivial (15 min de code). Pas la peine de bloquer le POC pour ça.

### Comportement du filtre prix sur `unknown` majoritaire

Même approche : décision à prendre après le recon, le champ existe toujours dans le JSON. 15 min de code pour basculer entre filtre 3-états et filtre binaire.

### Vocabulaire des genres

Idem : data-driven, à trancher après le recon avec les vraies fréquences. Le mapping vit dans `etl/genre-mapping.json` versionné, modifiable sans redéploiement.
