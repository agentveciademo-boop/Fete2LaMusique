# Ajouter un concert à la main (captures réseaux sociaux)

> **Pour démarrer une conversation Claude :** « Lis
> `/workspaces/PROJETS/Vercel/fete-de-la-musique/Fete2LaMusique/etl/AJOUTER-UN-CONCERT.md`,
> voici des captures de concerts à ajouter » + dépose les images.

Ce fichier décrit la pipeline d'ajout **manuel** de concerts que les agendas
officiels (OpenAgenda, Que faire à Paris) ne connaissent pas — typiquement
repérés sur Instagram / TikTok.

## Le principe en une phrase

Tu déposes des captures → Claude lit l'image, en extrait les infos, ajoute une
entrée dans [`manual-events.json`](manual-events.json) → on relance l'ETL → le
concert apparaît sur la carte avec le badge **« Repéré sur les réseaux »**.

## Le workflow complet

1. **Tu déposes** une ou plusieurs captures d'écran dans la conversation.
2. **Claude extrait** pour chaque affiche : titre, lieu, adresse, horaire, genre,
   compte Instagram/TikTok visible. Ne JAMAIS inventer un champ absent de
   l'image — on laisse vide (cf. règle « fidélité à la source »).
3. **Claude ajoute** les entrées dans le tableau `events` de
   [`manual-events.json`](manual-events.json).
4. **On relance l'ETL** depuis `Fete2LaMusique/` :
   ```bash
   npm run sync          # ou : bun run etl/sync.ts
   ```
   L'adresse est géocodée automatiquement (lat/lng via la Base Adresse
   Nationale, gratuit), puis `public/data/events.json` est régénéré +
   dédoublonné avec OpenAgenda/QFAP.
5. **On vérifie** le log : chaque concept retenu affiche `✓ « titre » → lat,lng`.
6. **On pousse** sur `dev` → preview sur https://dev.fete2lamusique.paname.ai
   ```bash
   git add etl/manual-events.json public/data/events.json
   git commit -m "feat(data): ajout concerts repérés sur les réseaux"
   git push origin dev
   ```

## Le format d'une entrée

Dans [`manual-events.json`](manual-events.json), pousser un objet dans `events` :

```json
{
  "title": "Nom du concert / de l'artiste",
  "venue_name": "Nom du lieu (bar, place, parc…)",
  "address": "12 rue Oberkampf, 75011 Paris",
  "start_time": "2026-06-20T20:30",
  "end_time": "2026-06-20T23:30",
  "genres": ["rock"],
  "instagram": "handle_sans_arobase",
  "tiktok": null,
  "description": "Une phrase de contexte.",
  "image_url": null,
  "source_url": "https://www.instagram.com/p/xxxxxxxx/",
  "is_outdoor": null,
  "lat": null,
  "lng": null,
  "zipcode": null
}
```

### Champs obligatoires

| Champ | Détail |
|---|---|
| `title` | Nom du concert ou de l'artiste. |
| `venue_name` | Nom du lieu. |
| `start_time` | Date + heure de début, **heure de Paris**. Format `2026-06-20T20:30` (le fuseau `+02:00` est ajouté automatiquement). |
| `address` **ou** `lat`+`lng` | L'adresse est géocodée auto. Si pas d'adresse précise (juste « Place de la République »), mettre l'adresse quand même — la BAN s'en sort souvent. En dernier recours, fournir `lat`/`lng` à la main. |

### Champs optionnels (et leur défaut)

| Champ | Défaut si absent |
|---|---|
| `end_time` | début **+ 3 h** |
| `genres` | `["autres"]` |
| `instagram` / `tiktok` | `null` (handle **sans** le `@`) |
| `description` | `""` |
| `image_url` | `null` |
| `source_url` | `null` — mettre l'URL du post d'origine si visible |
| `is_outdoor` | déduit du nom du lieu (rue/parc → plein air ; salle/bar → intérieur), sinon `null` |
| `lat` / `lng` | géocodés depuis `address`. Si fournis, **court-circuitent** le géocodage. |
| `zipcode` | sert à déduire l'arrondissement si l'adresse n'en contient pas |

## Genres valides

`genres` doit utiliser **uniquement** ce vocabulaire (tout autre mot est ignoré
avec un avertissement dans le log) :

```
jazz · rock · classique · electro · folk · rap · variete · world
pop · soul-funk · chorale · reggae · fanfare · trad · blues · autres
```

Correspondances utiles : hip-hop → `rap`, métal → `rock`, chanson → `variete`,
funk/soul/groove/r'n'b → `soul-funk`, dub/ragga → `reggae`, harmonie → `fanfare`.
On peut en mettre plusieurs : `["rock", "pop"]`.

## Bon à savoir

- **Prix** : la Fête de la Musique est gratuite → tout est forcé à `free`, on ne
  saisit pas de prix.
- **Pas de dédup** sur les concerts manuels : ils existent justement parce qu'ils
  manquent aux agendas officiels. Si tu en ajoutes un déjà présent dans
  OpenAgenda, il apparaîtra en double — à toi de l'enlever du JSON.
- **Id stable** : l'identifiant est dérivé du titre + lieu + date, pas de l'ordre
  dans le fichier. Réordonner `manual-events.json` ne casse pas les favoris.
- **Hors Paris** : un point à plus de 10 km du centre est gardé mais signalé dans
  le log (saisie volontaire assumée).
- **Enlever un concert** : supprimer son objet du tableau `events` et relancer
  `npm run sync`.

## Où vit quoi

| Fichier | Rôle |
|---|---|
| [`manual-events.json`](manual-events.json) | **Les données** — c'est ici qu'on ajoute/enlève les concerts. |
| [`sources/manuel.ts`](sources/manuel.ts) | La source ETL : lit le JSON, géocode, normalise. |
| [`sync.ts`](sync.ts) | L'orchestrateur qui fusionne toutes les sources → `public/data/events.json`. |
| `public/data/events.json` | Le résultat final consommé par le front (généré, ne pas éditer à la main). |
