/**
 * ETL OpenAgenda → public/data/events.json (JSON-first, pas de DB).
 *
 * Récupère l'agenda Fête de la Musique, filtre Paris (≤10km, haversine),
 * normalise vers le type Event du frontend (src/types/event.ts), et écrit
 * public/data/events.json. Chaque event porte sa source (`openagenda`) et
 * son `source_url` (page OpenAgenda de l'event) → affiché dans la fiche.
 *
 * Réutilise la logique calibrée par etl/recon.ts (schema styles, regex
 * plein air / prix, haversine, mapping genres canoniques).
 *
 * Usage :
 *   OPENAGENDA_API_KEY=xxx npx tsx etl/sync.ts          # agenda 2026 (défaut)
 *   SOURCE_AGENDA_UID=7476421 npx tsx etl/sync.ts        # archive 2025 (dev)
 * La clé peut aussi être lue depuis etl/.env (gitignored).
 */

import fs from 'node:fs'
import path from 'node:path'

// ---------- Env ----------

function loadEnv(): void {
  if (process.env.OPENAGENDA_API_KEY) return
  try {
    const content = fs.readFileSync(path.resolve('etl/.env'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* pas de .env, on compte sur l'env système */
  }
}
loadEnv()

const API_KEY = process.env.OPENAGENDA_API_KEY
if (!API_KEY) {
  console.error('Missing OPENAGENDA_API_KEY (env ou etl/.env).')
  process.exit(1)
}

const SOURCE_AGENDA_UID = Number(process.env.SOURCE_AGENDA_UID) || 4641572 // FdM 2026
const AGENDA_SLUGS: Record<number, string> = {
  4641572: 'fetedelamusique2026',
  7476421: 'fetedelamusique2025',
}
const AGENDA_SLUG = AGENDA_SLUGS[SOURCE_AGENDA_UID] ?? 'fetedelamusique2026'

const PARIS_LAT = 48.8534
const PARIS_LNG = 2.3488
const RADIUS_KM = 10
const PAGE_SIZE = 300

// ---------- Types (doivent matcher src/types/event.ts) ----------

type Genre =
  | 'jazz' | 'rock' | 'classique' | 'electro' | 'folk' | 'rap' | 'variete'
  | 'world' | 'pop' | 'soul-funk' | 'chorale' | 'reggae' | 'fanfare' | 'trad'
  | 'blues' | 'autres'

type PriceType = 'free' | 'paid' | 'prix_libre' | 'unknown'

type OutEvent = {
  id: string
  title: string
  venue_name: string
  address: string
  arrondissement: number | null
  commune: string
  lat: number
  lng: number
  start_time: string
  end_time: string
  session_date: string
  source: 'openagenda'
  source_url: string | null
  genres: Genre[]
  subgenres: string[]
  is_outdoor: boolean | null
  price_type: PriceType
  price_detail: string | null
  description: string
  image_url: string | null
}

type Localized<T> = Record<string, T> | undefined | null

type RawEvent = {
  uid: number
  title?: Localized<string>
  description?: Localized<string>
  longDescription?: Localized<string>
  timings?: Array<{ begin?: string; end?: string }>
  firstTiming?: { begin?: string; end?: string }
  conditions?: Localized<string>
  // Genres : `styles` (agenda 2026) ou `styles-musicaux` (archive 2025).
  styles?: number[]
  'styles-musicaux'?: number[]
  // Texte libre : `autre-styles` (2026) ou `autres-styles-musicaux` (2025).
  'autre-styles'?: string | null
  'autres-styles-musicaux'?: string | null
  image?: { base?: string; filename?: string } | null
  location?: {
    name?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    postalCode?: string | null
    city?: string | null
  } | null
}

// ---------- Schema (IDs styles-musicaux → labels) ----------

async function fetchStyleLabels(): Promise<Map<number, string>> {
  const url = `https://api.openagenda.com/v2/agendas/${SOURCE_AGENDA_UID}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Schema fetch failed: HTTP ${res.status}`)
  const data = (await res.json()) as {
    schema?: { fields?: Array<{ field: string; options?: Array<{ id: number; label?: Record<string, string> }> }> }
  }
  const field = (data.schema?.fields ?? []).find((f) => f.field === 'styles' || f.field === 'styles-musicaux')
  const m = new Map<number, string>()
  for (const o of field?.options ?? []) {
    const label = o.label?.fr ?? Object.values(o.label ?? {})[0] ?? `id=${o.id}`
    m.set(o.id, label)
  }
  return m
}

// ---------- Fetch events (cursor pagination + retry) ----------

async function fetchPage(after: string[] | null): Promise<{ events: RawEvent[]; after: string[] | null }> {
  const params = new URLSearchParams()
  params.set('size', String(PAGE_SIZE))
  params.set('detailed', '1')
  params.set('key', API_KEY!)
  if (after) for (const v of after) params.append('after[]', v)
  const url = `https://api.openagenda.com/v2/agendas/${SOURCE_AGENDA_UID}/events?${params}`
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const data = (await res.json()) as { events?: RawEvent[]; after?: string[] | null }
      return { events: data.events ?? [], after: data.after && data.after.length ? data.after : null }
    } catch (e) {
      lastErr = e
      const wait = 500 * 2 ** attempt
      console.error(`  attempt ${attempt} failed (${(e as Error).message}); retry in ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

async function fetchAll(): Promise<RawEvent[]> {
  const all: RawEvent[] = []
  let after: string[] | null = null
  let page = 0
  while (true) {
    const { events, after: next } = await fetchPage(after)
    all.push(...events)
    page++
    console.error(`  page ${page}: +${events.length} (total ${all.length})`)
    if (!next || events.length === 0 || page > 50) break
    after = next
  }
  return all
}

// ---------- Helpers (repris de recon.ts) ----------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const OUTDOOR_RE = /\b(rue|place|parc|jardin|square|esplanade|quai|parvis|berge|allée|allee|cour|terrasse|boulevard|avenue|promenade|kiosque|placette|halle)\b/i
const INDOOR_RE = /\b(salle|théâtre|theatre|conservatoire|bar|café|cafe|club|auditorium|église|eglise|chapelle|cinéma|cinema|médiathèque|mediatheque|bibliothèque|bibliotheque|musée|musee|galerie|brasserie|restaurant|pub|maison de quartier|centre culturel|école|ecole)\b/i

function inferOutdoor(loc: RawEvent['location']): boolean | null {
  const txt = `${loc?.name ?? ''} ${loc?.address ?? ''}`.toLowerCase().trim()
  if (!txt) return null
  const out = OUTDOOR_RE.test(txt)
  const ind = INDOOR_RE.test(txt)
  if (out && !ind) return true
  if (ind && !out) return false
  return null
}

const FREE_RE = /\b(gratuit|gratuite|entrée libre|entree libre|libre accès|libre acces|free entry)\b/i
const PRIX_LIBRE_RE = /\b(prix libre|au chapeau|chapeau|participation libre|donations?)\b/i
const PAID_RE = /(\b\d{1,3}[\s,.]?\d{0,2}\s*€|\beuros?\b|payant|tarif|billett?erie)/i

function parsePrice(text: string): PriceType {
  if (!text || !text.trim()) return 'unknown'
  if (PRIX_LIBRE_RE.test(text)) return 'prix_libre'
  if (FREE_RE.test(text) && !PAID_RE.test(text)) return 'free'
  if (PAID_RE.test(text)) return 'paid'
  return 'unknown'
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

function pickFr<T>(loc: Localized<T>): T | undefined {
  if (!loc) return undefined
  const o = loc as Record<string, T>
  return o['fr'] ?? o['fr-FR'] ?? Object.values(o)[0]
}

function extractArrondissement(pc: string | null | undefined): number | null {
  if (!pc) return null
  if (pc === '75116') return 16
  if (/^750\d{2}$/.test(pc)) {
    const n = parseInt(pc.slice(3), 10)
    if (n >= 1 && n <= 20) return n
  }
  return null
}

// Soirée bucket : un concert qui commence avant 06h appartient à la soirée de la veille.
function sessionDate(beginIso: string): string {
  const date = beginIso.slice(0, 10)
  const hour = parseInt(beginIso.slice(11, 13), 10)
  if (Number.isFinite(hour) && hour < 6) {
    const d = new Date(`${date}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return date
}

function addHours(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3_600_000).toISOString()
}

// ---------- Mapping genres (labels OpenAgenda → genres canoniques de l'app) ----------

const VALID_GENRES = new Set<Genre>([
  'jazz', 'rock', 'classique', 'electro', 'folk', 'rap', 'variete', 'world',
  'pop', 'soul-funk', 'chorale', 'reggae', 'fanfare', 'trad', 'blues', 'autres',
])

// Clés normalisées (minuscules, sans accents) → robuste aux variantes 2025/2026
// ("Hip-Hop"/"Hip-hop", "Metal"/"Métal"). Métal n'a pas de chip dédié → rock.
const GENRE_MAP: Record<string, Genre> = {
  blues: 'blues',
  chanson: 'variete',
  variete: 'variete',
  'hip-hop': 'rap',
  rap: 'rap',
  ragga: 'reggae',
  reggae: 'reggae',
  dub: 'reggae',
  folk: 'folk',
  funk: 'soul-funk',
  soul: 'soul-funk',
  groove: 'soul-funk',
  "r'n'b": 'soul-funk',
  jazz: 'jazz',
  metal: 'rock',
  'musique classique': 'classique',
  'musique contemporaine': 'classique',
  'musique du monde': 'world',
  'musique electronique': 'electro',
  'musique rock': 'rock',
  'musique traditionnelle': 'trad',
  pop: 'pop',
  chorale: 'chorale',
  fanfare: 'fanfare',
  harmonie: 'fanfare',
  autre: 'autres',
}

function normalizeLabel(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function normalizeGenres(styleIds: number[], styleLabels: Map<number, string>, unmapped: Map<string, number>): Genre[] {
  const out = new Set<Genre>()
  for (const id of styleIds) {
    const label = styleLabels.get(id)
    if (!label) continue
    const canon = GENRE_MAP[normalizeLabel(label)]
    if (canon && VALID_GENRES.has(canon)) out.add(canon)
    else unmapped.set(label, (unmapped.get(label) ?? 0) + 1)
  }
  if (out.size === 0) out.add('autres')
  return [...out]
}

function parseSubgenres(raw: string | null | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const piece of raw.split(/[,;/+]|\s+et\s+|\n/i)) {
    const k = piece.trim()
    if (k.length > 1 && k.length <= 30) seen.add(k)
  }
  return [...seen].slice(0, 8)
}

// ---------- Main ----------

async function main(): Promise<void> {
  console.error(`Agenda ${SOURCE_AGENDA_UID} (${AGENDA_SLUG}) — fetch schema…`)
  const styleLabels = await fetchStyleLabels()
  console.error(`  ${styleLabels.size} styles musicaux`)

  console.error(`Fetch events (detailed=1)…`)
  const raw = await fetchAll()
  console.error(`Total fetched: ${raw.length}`)

  const inParis = raw.filter((e) => {
    const lat = e.location?.latitude
    const lng = e.location?.longitude
    return lat != null && lng != null && haversineKm(PARIS_LAT, PARIS_LNG, lat, lng) <= RADIUS_KM
  })
  console.error(`≤${RADIUS_KM}km Paris: ${inParis.length}`)

  const normalized: OutEvent[] = []
  const unmapped = new Map<string, number>()
  let droppedNoTiming = 0
  let droppedNoCoords = 0

  for (const e of raw) {
    const lat = e.location?.latitude
    const lng = e.location?.longitude
    if (lat == null || lng == null) {
      droppedNoCoords++
      continue
    }
    if (haversineKm(PARIS_LAT, PARIS_LNG, lat, lng) > RADIUS_KM) continue

    const timings = e.timings && e.timings.length > 0 ? e.timings : e.firstTiming ? [e.firstTiming] : []
    if (timings.length === 0) {
      droppedNoTiming++
      continue
    }

    const genres = normalizeGenres(e.styles ?? e['styles-musicaux'] ?? [], styleLabels, unmapped)
    const subgenres = parseSubgenres(e['autre-styles'] ?? e['autres-styles-musicaux'])
    const isOutdoor = inferOutdoor(e.location)
    const priceText = `${stripHtml(pickFr(e.longDescription) ?? '')} ${pickFr(e.description) ?? ''} ${pickFr(e.conditions) ?? ''}`
    const priceType = parsePrice(priceText)
    const title = (pickFr(e.title) ?? '').trim()
    const description = (pickFr(e.description) ?? stripHtml(pickFr(e.longDescription) ?? '')).trim()
    const imageUrl = e.image?.base && e.image.filename ? `${e.image.base}${e.image.filename}` : null

    timings.forEach((t, idx) => {
      if (!t.begin) return
      normalized.push({
        id: `${e.uid}-${idx}`,
        title,
        venue_name: e.location?.name ?? '',
        address: e.location?.address ?? '',
        arrondissement: extractArrondissement(e.location?.postalCode),
        commune: e.location?.city ?? '',
        lat,
        lng,
        start_time: t.begin,
        end_time: t.end ?? addHours(t.begin, 3),
        session_date: sessionDate(t.begin),
        source: 'openagenda',
        source_url: `https://openagenda.com/fr/${AGENDA_SLUG}/events/${e.uid}`,
        genres,
        subgenres,
        is_outdoor: isOutdoor,
        price_type: priceType,
        price_detail: null,
        description,
        image_url: imageUrl,
      })
    })
  }

  // Tri stable par start_time (minimise les diffs git).
  normalized.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id))

  const outputPath = path.resolve('public/data/events.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_agenda_uid: SOURCE_AGENDA_UID,
        event_count: normalized.length,
        events: normalized,
      },
      null,
      2,
    ),
  )

  const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outputPath}`)
  console.error(`  events=${normalized.length}, size=${sizeKb} KB`)
  console.error(`  dropped: noCoords=${droppedNoCoords} (hors filtre Paris inclus), noTiming=${droppedNoTiming}`)
  if (unmapped.size > 0) {
    console.error(`  styles non mappés → 'autres': ${[...unmapped.entries()].map(([k, c]) => `${k}(${c})`).join(', ')}`)
  }
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
