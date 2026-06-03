# Sources de données

## Source principale : OpenAgenda v2

**Plateforme officielle** utilisée par le Ministère de la Culture pour la Fête de la Musique.

### URLs et identifiants

| Élément | Valeur |
|---------|--------|
| Agenda 2026 | https://openagenda.com/fr/fetedelamusique2026 |
| UID 2026 | `4641572` |
| UID 2025 (archive, pour dev) | `7476421` |
| Base API | `https://api.openagenda.com/v2/agendas/{uid}/events` |
| Doc API | https://developers.openagenda.com/ |

### Authentification

- Compte gratuit sur openagenda.com
- Clé publique disponible dans `openagenda.com/settings/apiKey`
- Header : `key: YOUR_PUBLIC_KEY` (ou query param `?key=...`)

### Paramètres clés

```
GET /v2/agendas/4641572/events
  ?size=100                         # max 300/page
  &offset=0                         # pagination
  &oaq[from]=2026-06-21T00:00:00
  &oaq[to]=2026-06-22T03:00:00
  &oaq[lat]=48.8534
  &oaq[lng]=2.3488
  &oaq[radius]=10                   # km
```

### Schéma événement (champs utilisés)

```json
{
  "uid": 123456,
  "title": { "fr": "Concert Jazz" },
  "description": { "fr": "Description courte" },
  "longDescription": { "fr": "Description longue markdown" },
  "keywords": { "fr": ["jazz", "concert", "gratuit"] },
  "timings": [
    {
      "begin": "2026-06-21T19:00:00+02:00",
      "end": "2026-06-21T22:00:00+02:00"
    }
  ],
  "attendanceMode": 1,
  "conditions": { "fr": "Gratuit" },
  "image": { "base": "https://cdn.openagenda.com/..." },
  "location": {
    "name": "Place de la République",
    "address": "Place de la République, 75011 Paris",
    "latitude": 48.867,
    "longitude": 2.364,
    "postalCode": "75011",
    "city": "Paris"
  },
  "tagGroups": [
    {
      "name": "Genre musical",
      "tags": ["Jazz", "Blues"]
    }
  ]
}
```

### `attendanceMode` (valeurs)

- `1` = offline (présentiel)
- `2` = online
- `3` = mixed

Utilisé pour inférer `is_outdoor` en combinaison avec des heuristiques sur le venue name (rue, place, parc → outdoor).

### Limites et licence

- Licence ouverte, réutilisation autorisée
- Pas de rate limit publié, mais respect raisonnable attendu
- L'ancien `events.json` est déprécié fin 2025 — **utiliser uniquement v2**

### Timing critique

- **21 mai 2026** : deadline d'inscription pour les organisateurs
- **15-20 juin 2026** : agenda atteint sa densité finale
- Pendant le dev : utiliser l'agenda 2025 (UID `7476421`) comme dataset de test

## Source complémentaire : Que Faire à Paris

**Si besoin de compléter** OpenAgenda avec les events estampillés Ville de Paris.

| Élément | Valeur |
|---------|--------|
| Portail | https://opendata.paris.fr |
| Dataset | `que-faire-a-paris-` |
| API | `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records` |
| Licence | ODbL (attribution requise) |
| Fréquence | Daily |

**Limite** : pas de tag dédié "Fête de la Musique", il faut filtrer par date + tag `Concert`. Le sous-ensemble couvert sera plus restreint qu'OpenAgenda.

**Décision** : ne pas l'inclure dans le MVP. À envisager si OpenAgenda s'avère trop incomplet.

## Sources écartées

- **data.culture.gouv.fr** : pas de dataset Fête de la Musique récent
- **Île-de-France open data** (dataset `evenements-publics-cibul`) : mesuré le 2026-06-03,
  c'est OpenAgenda ré-agrégé (contient déjà nos events) + du bruit non-musical
  (Cité des sciences, expos). ~0 concert net-new. Abandonné.

### Scraping sites éditoriaux (sortiraparis, jds.fr, agendaculturel) — mesuré le 2026-06-03

Évaluation « mesure d'abord » avant tout scraper pérenne, base de référence =
250 events de `public/data/events.json` (OpenAgenda + Que faire à Paris).

| Site | Events FdM trouvés | Net-new réel (vérifié) | Accès |
|---|---|---|---|
| **jds.fr** | 17 (fenêtre 20-21 juin) | **1** | OK (JSON-LD `MusicEvent` propre) |
| **sortiraparis.com** (guide par arrondissement) | 69 | **7** | OK (curl 200, prose à parser) |
| **agendaculturel.fr** | — | non mesuré | bloqué Cloudflare (403, nécessiterait Playwright) |

**Net-new total mesuré : ~8 concerts** (dont 5 in-scope FdM de rue, et 3 grands
plateaux institutionnels *sur réservation/invitation* — Orchestre de Paris au Louvre,
Viva l'Orchestra à Radio France, France Inter à l'Olympia — au scope discutable).

Net-new in-scope confirmés absents de la base :
- Grand Concert Gospel @ Église Saint-Philippe du Roule (8e) — *jds.fr*
- Chœur de Pierre (comédies musicales) @ Grand Rex (2e) — *sortiraparis*
- Jeunes Talents classique @ Archives Nationales (3e) — *sortiraparis*
- Concerts & DJ set @ Rosa Bonheur sur Seine (7e) — *sortiraparis*
- Open air Daddy Trance (M. Hoffstadt) @ Hasard Ludique (18e) — *sortiraparis*

**Constat décisif** : même la sélection éditoriale « best-of » de Sortiraparis est
redondante à ~90 % avec notre base. Et ces sites ne listent que ~70 têtes d'affiche,
jamais la longue traîne des centaines de petits concerts de rue — précisément ce
qu'OpenAgenda (soumis par les organisateurs) capture déjà et qu'un scraper éditorial
ne peut pas ramener.

**Décision (Florian, 2026-06-03)** : net-new ~8 < seuil 15-20 → **ne PAS pérenniser
de scraper**. Coût/fragilité (HTML cassant, Cloudflare, CGU de sites commerciaux,
maintenance) disproportionnés à J-16 pour ~8 events dont 3 hors-esprit. On ne touche
pas aux données (250 events conservés). À ré-évaluer seulement si OpenAgenda + Paris.fr
se révélaient nettement incomplets à l'approche du jour J.
