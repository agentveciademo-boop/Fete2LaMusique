# Schéma de données Supabase

## Table `events`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE events (
  -- Identifiants
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openagenda_uid bigint NOT NULL,
  timing_index int NOT NULL DEFAULT 0,
  UNIQUE (openagenda_uid, timing_index),

  -- Contenu
  title text NOT NULL,
  description text,
  long_description text,

  -- Lieu (PostGIS)
  location geometry(Point, 4326) NOT NULL,
  venue_name text,
  address text,
  postal_code text,
  arrondissement int,        -- 1-20, NULL hors Paris intramuros
  commune text,              -- nom de commune (Paris, Montreuil, Boulogne-Billancourt, ...)
  code_insee text,           -- code INSEE de la commune (5 caractères)
  city text DEFAULT 'Paris',

  -- Temps (un event = un timing ; les events à timings multiples
  -- génèrent plusieurs lignes, distinguées par timing_index)
  start_time timestamptz NOT NULL,
  end_time timestamptz,

  -- Genres
  genres text[] NOT NULL DEFAULT '{}',     -- normalisés : ['jazz', 'blues']
  genres_raw text[] DEFAULT '{}',          -- tags bruts OpenAgenda (audit)

  -- Lieu physique (inféré depuis attendanceMode + heuristiques)
  is_outdoor boolean,                       -- NULL si indéterminé

  -- Prix
  price_type text CHECK (price_type IN ('free', 'paid', 'prix_libre', 'unknown'))
    DEFAULT 'unknown',
  price_detail text,

  -- Médias
  image_url text,
  source_url text,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index critiques
CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_start_time ON events (start_time);
CREATE INDEX idx_events_genres ON events USING GIN (genres);
CREATE INDEX idx_events_arrondissement ON events (arrondissement);
CREATE INDEX idx_events_price_type ON events (price_type);
```

## Note sur les timings multiples

Un événement OpenAgenda peut avoir plusieurs `timings` (concerts répétés sur plusieurs jours, ou plusieurs créneaux le même jour). Pour la Fête de la Musique on filtre sur le 21 juin, mais un event peut tout de même avoir plusieurs créneaux ce jour-là (par exemple 16h-18h puis 20h-22h).

**Décision** : une ligne par timing. La clé unique est `(openagenda_uid, timing_index)`. L'avantage : les requêtes temporelles sont triviales. L'inconvénient : doublons d'info au niveau du contenu (title, description) — c'est acceptable, le volume reste petit (~quelques milliers de lignes).

## Genres normalisés (vocabulaire contrôlé)

> **⚠️ PENDING RECON** — Le vocabulaire ci-dessous est **provisionnel**. La liste définitive sera tranchée par l'agent ETL après recon sur l'agenda 2025 (UID `7476421`), selon la règle : tout genre représentant ≥ 3% des events mérite son chip. Ajouts probables suite au recon : `fanfare`, `chorale`, `soul/funk`, `trad`, `dj-set`. À documenter dans `docs/recon-report.md`.

Provisionnel :

| Genre normalisé | Tags bruts mappés (exemples) |
|----------------|------------------------------|
| `jazz`         | Jazz, jazz manouche, jazz New Orleans, swing |
| `blues`        | blues, rhythm and blues |
| `rock`         | rock, rock indé, indie rock, punk rock |
| `classique`    | classique, baroque, musique classique, opéra |
| `electro`      | électro, techno, house, drum and bass, EDM |
| `folk`         | folk, country, americana |
| `reggae`       | reggae, ska, dub |
| `rap`          | rap, hip-hop, hip hop, trap |
| `variete`      | variété française, chanson française, pop française |
| `pop`          | pop, pop rock, pop indé |
| `world`        | musiques du monde, world, afro, latino, raï |
| `metal`        | metal, hard rock, heavy metal |
| `autres`       | tout ce qui n'est pas mappé |

Le mapping vit dans un fichier `etl/genre-mapping.json` versionné, modifiable sans redéploiement.

### Règle multi-genre

Un tag brut peut mapper vers **un ou plusieurs genres canoniques**. Exemple : `"pop rock"` → `['pop', 'rock']`. Le mapping JSON utilise donc des valeurs array, pas string :

```json
{
  "pop rock": ["pop", "rock"],
  "jazz manouche": ["jazz"],
  "afro-jazz": ["jazz", "world"]
}
```

L'ETL déduplique les genres résultants par event (`['jazz', 'jazz']` → `['jazz']`).

### Affichage UI vs stockage DB

La DB stocke **tous les genres canoniques** (~13). Le frontend en affiche un sous-ensemble (~8-9 chips + "Autres") défini dans `src/data/genres.ts`. Les genres non-affichés sont rattachés à un genre proche pour le filtrage carte ou tombent dans "Autres".

Pourquoi : ça garde la donnée riche pour le chatbot v2 sans saturer l'UI carte.

## RPC PostGIS pour le frontend

```sql
-- Renvoie les events dans un rayon, triés par distance
CREATE OR REPLACE FUNCTION events_near(
  lat float,
  lng float,
  radius_m int DEFAULT 1000
)
RETURNS SETOF events
LANGUAGE sql STABLE
AS $$
  SELECT * FROM events
  WHERE ST_DWithin(
    location::geography,
    ST_MakePoint(lng, lat)::geography,
    radius_m
  )
  ORDER BY ST_Distance(
    location::geography,
    ST_MakePoint(lng, lat)::geography
  );
$$;
```

## RLS (Row Level Security)

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "public read" ON events FOR SELECT USING (true);

-- Écriture réservée au service role (ETL uniquement)
-- Pas de policy INSERT/UPDATE/DELETE pour les clients anon
```
