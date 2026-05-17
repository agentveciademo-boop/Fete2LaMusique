# Recon report — OpenAgenda 2025 (Fête de la Musique)

> Généré automatiquement par `etl/recon.ts` — 2026-05-16T20:07:28.771Z
> Agenda source : UID `7476421` (Fête de la Musique 2025)
> Périmètre métier : rayon 10 km autour de Paris (48.8534, 2.3488), filtré côté script via haversine

## Surprises vs. `docs/data-sources.md`

- ❌ Pas de `tagGroups[]` : les genres sont dans un **champ custom structuré `styles-musicaux`** (array d'IDs numériques), vocabulaire OpenAgenda déjà contrôlé. Mapping IDs → labels récupéré via `/agendas/7476421`.
- ❌ `conditions.fr` est presque toujours vide. Le vrai champ structuré est **`conditions-participation`** : `32` = "Sans réservation/inscription", `33` = "Sur réservation/inscription". Aucun champ structuré sur le **prix** : la Fête de la Musique est gratuite par essence.
- ⚠️ `timings[]` requiert `?detailed=1` (sinon seulement `firstTiming` / `lastTiming`).
- ⚠️ Pagination par cursor (`after[]`), pas d'offset officiel. Le filtre `oaq[lat/lng/radius]` ne fonctionne pas comme la doc le suggère.
- ✅ `location.latitude/longitude/postalCode/city` présents et fiables (cf. Q7).

## Q1 — Volume total

| Métrique | Valeur |
|----------|--------|
| Events agenda entier (toute la France) | 2220 |
| Events ≤ 10 km de Paris | **365** |
| Timings totaux (split multi-timings, sous-corpus Paris) | 413 |
| Events normalisables (lat/lng + ≥1 timing) | 413 |
| Events rejetés faute de timing | 0 |
| Taille JSON brut | 265.0 KB |
| Taille JSON **gzippé** | **41.3 KB** |

**Seuil** : > 500 KB gzippé → escalade DB
**Reco auto** : ✅ **JSON statique OK** (largement sous le seuil)

## Q2 — Vocabulaire genres (champ structuré `styles-musicaux`)

Distribution des **26** styles musicaux OpenAgenda (count = nb d'events Paris contenant le style) :

| ID | Label OpenAgenda | Count | % events |
|----|------------------|-------|----------|
| 16 | Musique rock | 95 | 26.0% |
| 15 | Musique électronique | 93 | 25.5% |
| 18 | Pop | 91 | 24.9% |
| 31 | Autre | 89 | 24.4% |
| 14 | Musique du monde | 75 | 20.5% |
| 2 | Chanson | 68 | 18.6% |
| 24 | Variété | 57 | 15.6% |
| 9 | Jazz | 54 | 14.8% |
| 12 | Musique classique | 50 | 13.7% |
| 8 | Groove | 47 | 12.9% |
| 7 | Funk | 47 | 12.9% |
| 3 | Chorale | 45 | 12.3% |
| 23 | Soul | 41 | 11.2% |
| 29 | Hip-Hop | 40 | 11.0% |
| 17 | Musique traditionnelle | 34 | 9.3% |
| 1 | Blues | 31 | 8.5% |
| 13 | Musique contemporaine | 30 | 8.2% |
| 19 | R'n'B | 30 | 8.2% |
| 21 | Rap | 24 | 6.6% |
| 6 | Folk | 22 | 6.0% |
| 5 | Fanfare | 22 | 6.0% |
| 22 | Reggae | 17 | 4.7% |
| 10 | Harmonie | 12 | 3.3% |
| 20 | Ragga | 10 | 2.7% |
| 11 | Metal | 8 | 2.2% |
| 4 | Dub | 7 | 1.9% |

Events sans aucun `styles-musicaux` : 0 (0.0%) — défileront en "autres"
Events avec `autres-styles-musicaux` libre saisi : 86 (23.6%)

**Seuil** : style ≥ 3% des events Paris (= 11) → mérite son chip canonique distinct
**Styles qualifiants (≥ 3%)** : 23

- `Musique rock` (26.0%)
- `Musique électronique` (25.5%)
- `Pop` (24.9%)
- `Autre` (24.4%)
- `Musique du monde` (20.5%)
- `Chanson` (18.6%)
- `Variété` (15.6%)
- `Jazz` (14.8%)
- `Musique classique` (13.7%)
- `Groove` (12.9%)
- `Funk` (12.9%)
- `Chorale` (12.3%)
- `Soul` (11.2%)
- `Hip-Hop` (11.0%)
- `Musique traditionnelle` (9.3%)
- `Blues` (8.5%)
- `Musique contemporaine` (8.2%)
- `R'n'B` (8.2%)
- `Rap` (6.6%)
- `Folk` (6.0%)
- `Fanfare` (6.0%)
- `Reggae` (4.7%)
- `Harmonie` (3.3%)

### Reco vocabulaire canonique (mapping OpenAgenda → app)

Mapping proposé (à valider) :

| Genre canonique | Sources OpenAgenda | Count cumulé | % events |
|-----------------|--------------------|-------------|----------|
| `soul-funk` | Soul, Groove, Funk, R'n'B | 165 | 45.2% |
| `variete` | Variété, Chanson | 125 | 34.2% |
| `rock` | Musique rock | 95 | 26.0% |
| `electro` | Musique électronique | 93 | 25.5% |
| `pop` | Pop | 91 | 24.9% |
| `autres` | Autre | 89 | 24.4% |
| `classique` | Musique classique, Musique contemporaine | 80 | 21.9% |
| `world` | Musique du monde | 75 | 20.5% |
| `rap` | Rap, Hip-Hop | 64 | 17.5% |
| `jazz` | Jazz | 54 | 14.8% |
| `chorale` | Chorale | 45 | 12.3% |
| `reggae` | Dub, Ragga, Reggae | 34 | 9.3% |
| `fanfare` | Fanfare, Harmonie | 34 | 9.3% |
| `trad` | Musique traditionnelle | 34 | 9.3% |
| `blues` | Blues | 31 | 8.5% |
| `folk` | Folk | 22 | 6.0% |
| `metal` | Metal | 8 | 2.2% |

### Top 20 `autres-styles-musicaux` (texte libre — pour audit)

- `gospel` (8)
- `house` (5)
- `samba` (4)
- `salsa` (3)
- `reggaeton` (3)
- `chorale gospel` (3)
- `electro` (2)
- `latin` (2)
- `baile funk` (2)
- `afro` (2)
- `bossa nova` (2)
- `amapiano` (2)
- `dancehall` (2)
- `percussions` (2)
- `hardcore` (2)
- `frenchcore` (2)
- `batucada` (2)
- `rock` (2)
- `tango` (2)
- `indie` (2)

## Q3 — attendanceMode

Distribution (`1`=offline, `2`=online, `3`=mixed) :

- `1` : 355 (97.3%)
- `3` : 9 (2.5%)
- `2` : 1 (0.3%)

**Constat** : mixte mais dominée par offline — **insuffisant** pour distinguer plein air / salle. Inférence regex obligatoire (Q4).

## Q4 — is_outdoor (inférence regex sur `venue_name + address`)

Regex outdoor : `\b(rue|place|parc|jardin|square|esplanade|quai|parvis|berge|allée|allee|cour|terrasse|boulevard|avenue|promenade|kiosque|placette|cour|jardin|halle)\b`
Regex indoor  : `\b(salle|théâtre|theatre|conservatoire|bar|café|cafe|club|auditorium|église|eglise|chapelle|cinéma|cinema|médiathèque|mediatheque|bibliothèque|bibliotheque|musée|musee|galerie|brasserie|restaurant|pub|maison de quartier|centre culturel|école|ecole)\b`

| Catégorie | Count | % |
|-----------|-------|---|
| outdoor=true | 283 | 77.5% |
| outdoor=false | 4 | 1.1% |
| outdoor=null (indéterminé) | 78 | **21.4%** |

**Seuil** : NULL < 30% → garder le filtre UI ; sinon retirer du filtre, garder comme badge
**Reco auto** : ✅ **GARDER le filtre UI**

## Q5 — Prix (revisé)

Le champ `conditions.fr` est quasi-systématiquement vide. Le champ structuré le plus proche est `conditions-participation` (32/33), qui parle d'**inscription** et non de prix.

### 5.a — Distribution de `conditions-participation` (champ structuré)

- `Sans réservation/sans inscription` : 343 (94.0%)
- `Sur réservation/inscription` : 22 (6.0%)

### 5.b — Inférence `price_type` (regex sur `longDescription + description + conditions`)

| Catégorie | Count | % |
|-----------|-------|---|
| free | 82 | 22.5% |
| paid | 7 | 1.9% |
| prix_libre | 0 | 0.0% |
| unknown | 276 | **75.6%** |

**Seuil** : unknown < 40% → filtre 3-états utile ; sinon toggle binaire ou retrait
**Reco auto** : ⚠️ **Retirer le filtre prix** — données quasi inexistantes côté source. À la Fête de la Musique tout est gratuit par défaut. Remplacer éventuellement par un filtre "Cacher events avec inscription requise" basé sur `conditions-participation=33`.

## Q6 — Multi-genre

Nombre de styles distincts par event (sur `styles-musicaux`) :

- 1 style(s) : 118 events (32.3%)
- 2 style(s) : 78 events (21.4%)
- 3 style(s) : 66 events (18.1%)
- 4 style(s) : 35 events (9.6%)
- 5 style(s) : 14 events (3.8%)
- 6 style(s) : 16 events (4.4%)
- 7 style(s) : 13 events (3.6%)
- 8 style(s) : 9 events (2.5%)
- 9 style(s) : 8 events (2.2%)
- 10 style(s) : 2 events (0.5%)
- 12 style(s) : 2 events (0.5%)
- 14 style(s) : 1 events (0.3%)
- 19 style(s) : 1 events (0.3%)
- 23 style(s) : 1 events (0.3%)
- 26 style(s) : 1 events (0.3%)

Events avec ≥ 2 styles : 247 (67.7%)
**Reco auto** : ✅ **multi-genre confirmé** (>10% des events) — sémantique array nécessaire

## Q7 — Présence des champs critiques

| Champ | NULL count | % NULL |
|-------|-----------|--------|
| location.latitude | 0 | 0.0% |
| location.longitude | 0 | 0.0% |
| timings[0].begin | 0 | 0.0% |
| timings[0].end | 0 | 0.0% |
| location.postalCode | 0 | 0.0% |
| title (toute langue) | 0 | 0.0% |

**Seuil** : > 5% NULL sur lat/lng → rejeter les events sans coords
**Reco auto** : ✅ Coords fiables (<5% NULL), skip simple suffit (sous-corpus déjà filtré par haversine, donc 0% ici)

## Q8 — Échantillons qualitatifs

### 30 venue names (random)

- Centre municipal Esport
- Place de la Mairie
- Place des Martyrs
- Maison du Japon, Cité Internationale Universitaire de Paris
- The American Cathedral in Paris
- Acier Meringué à Paris
- 19|46
- Sous le métro
- Grande Place
- Place Igor Stravinsky 75004 Paris
- 12 villa d'Esté
- Hopital Tenon AP-HP, Cour d'Honneur
- Square Jules Ferry
- Cabaret Sauvage
- 2 rue Gabrielle
- Caffé Créole
- Archives nationales de France
- Le Relai de Bretagne
- doublevie
- La Rhumerie
- Place Pierre Sémard
- Cité internationale universitaire de Paris
- Centre Culturel de Serbie
- Musée Jacquemart-André
- Folderol
- rue du groupe Manouchian 75020
- Clubber
- Bibliothèque musicale La Grange-Fleuret
- Le Plaisance
- Parc Henri Matisse à Châtillon

### 30 `conditions.fr` non-vides (random, tronqué 200 chars)

- 50
- Dans la limite des places disponibles
- Dans la limite des places disponibles.
- entrée libre
- Nombre de places limitées
- Gratuit dans la limite des places disponibles
- entrée libre
- Entrée libre
- Pas de limitation de places.
- Le concert à lieu en extérieur, 250 assises disponibles. En cas d'intempérie, le concert aura lieu en intérieur.
- 50
- Entrée libre
- entrée libre
- pas de limite
- Entrée Libre
- Entrée libre
- Entrée gratuite
- 30 (pour la visite musicalisée uniquement)
- Nous prévoyons d’amener un générateur et un DJ set.
- Le parc est grand, la capacité sur la pelouse en d'environ 800 personnes et bien plus sur le site ! En cas de chaleur, prévoyez vos gourdes, de la crème solaire et de quoi couvrir votre tête (il y a a
- Entrée libre dans la limite des places disponibles
- 200
- 600 / ENCEINTES / PLATINES / NOUS SOUHAITONS EGALEMENT FERMER LA RUE CAR ON AURA BEAUCOUP DE MONDE POUR EVITER LE RISQUE D ACCIDENT
- 700
- Entrée libre
- entrée libre
- Accès libre.
- Entrée libre
- Entrée libre, dans la limite des places disponibles
- 65 places par session

### 20 `autres-styles-musicaux` (texte libre, random)

- Techno - Hard Techno - Hard Trance
- cumbia, salsa, merengue, bachata, reggaeton
- Rockabilly
- house
- Chorale Gospel
- Eveil musical
- Chorale Gospel
- Musique traditionnelle japonaise
- Afrobeats, amapiano, afrohouse, dancehall
- Gospel
- House libanaise
- Bossa nova et rythmes brésiliens.
- samba, bossa nova, baile funk
- salsa. bachata. kizomba
- Gospel
- Percussions afro-cubaines
- Musiques actuelles
- Carimbo
- AFRO
- Latino, samba, reggaeton, salsa, tango

## Décisions implicites

| Question | Seuil | Mesuré | Reco auto | Décision humaine |
|----------|-------|--------|-----------|------------------|
| Q1 — taille JSON | < 500 KB gzippé | 41.3 KB | JSON statique OK | [ ] |
| Q2 — vocab genres | style ≥ 3% | 23 style(s) qualifiant(s) | voir mapping canonique | [ ] |
| Q3 — attendanceMode pour outdoor | suffisant ? | 97.3% offline | insuffisant, regex requis | [ ] |
| Q4 — is_outdoor | NULL < 30% | 21.4% NULL | GARDER filtre | [ ] |
| Q5 — price_type | unknown < 40% | 75.6% unknown | Retirer filtre prix | [ ] |
| Q6 — multi-genre | utile ? | 247 events ≥2 styles (67.7%) | conserver array | [ ] |
| Q7 — coords NULL | < 5% | 0.0% | skip OK | [ ] |

---

_Régénérable via `node etl/recon.ts` (avec `OPENAGENDA_API_KEY` en env). Idempotent modulo date de génération et échantillons Q8._
