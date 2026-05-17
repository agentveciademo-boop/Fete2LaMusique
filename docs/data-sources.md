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
- **Scraping sortiraparis.com / timeout.fr** : HTML non-structuré, fragile
- **Île-de-France open data** : mirror partiel d'OpenAgenda, latence supplémentaire
