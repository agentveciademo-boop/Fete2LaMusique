/**
 * Source OpenAgenda → OutEvent[] (agenda officiel Fête de la Musique).
 *
 * Récupère l'agenda (UID 4641572 en 2026), filtre Paris (≤10 km, haversine),
 * normalise vers OutEvent. Logique déplacée verbatim depuis l'ancien sync.ts —
 * comportement inchangé. L'orchestrateur (sync.ts) appelle fetchOpenAgenda().
 *
 * Env :
 *   OPENAGENDA_API_KEY=xxx      # requis (env système ou etl/.env)
 *   SOURCE_AGENDA_UID=7476421   # optionnel : archive 2025 (dev)
 */

import '../lib/env'
import {
  type Genre,
  type OutEvent,
  addHours,
  extractArrondissement,
  GENRE_MAP,
  haversineKm,
  inferOutdoorFromText,
  normalizeLabel,
  PARIS_LAT,
  PARIS_LNG,
  parseSubgenres,
  RADIUS_KM,
  sessionDate,
  stripHtml,
  VALID_GENRES,
} from '../lib/normalize'

const SOURCE_AGENDA_UID = Number(process.env.SOURCE_AGENDA_UID) || 4641572 // FdM 2026
const AGENDA_SLUGS: Record<number, string> = {
  4641572: 'fetedelamusique2026',
  7476421: 'fetedelamusique2025',
}
const AGENDA_SLUG = AGENDA_SLUGS[SOURCE_AGENDA_UID] ?? 'fetedelamusique2026'
const PAGE_SIZE = 300

type Localized<T> = Record<string, T> | undefined | null

type RawEvent = {
  uid: number
  title?: Localized<string>
  description?: Localized<string>
  longDescription?: Localized<string>
  timings?: Array<{ begin?: string; end?: string }>
  firstTiming?: { begin?: string; end?: string }
  conditions?: Localized<string>
  styles?: number[]
  'styles-musicaux'?: number[]
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

function pickFr<T>(loc: Localized<T>): T | undefined {
  if (!loc) return undefined
  const o = loc as Record<string, T>
  return o['fr'] ?? o['fr-FR'] ?? Object.values(o)[0]
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

// ---------- Schema (IDs styles-musicaux → labels) ----------

async function fetchStyleLabels(): Promise<Map<number, string>> {
  const url = `https://api.openagenda.com/v2/agendas/${SOURCE_AGENDA_UID}?key=${process.env.OPENAGENDA_API_KEY}`
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
  params.set('key', process.env.OPENAGENDA_API_KEY!)
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

// ---------- API publique ----------

export async function fetchOpenAgenda(): Promise<OutEvent[]> {
  if (!process.env.OPENAGENDA_API_KEY) throw new Error('Missing OPENAGENDA_API_KEY (env ou etl/.env).')

  console.error(`[openagenda] agenda ${SOURCE_AGENDA_UID} (${AGENDA_SLUG}) — fetch schema…`)
  const styleLabels = await fetchStyleLabels()
  console.error(`[openagenda]   ${styleLabels.size} styles musicaux`)

  console.error(`[openagenda] fetch events (detailed=1)…`)
  const raw = await fetchAll()
  console.error(`[openagenda] total fetched: ${raw.length}`)

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
    const isOutdoor = inferOutdoorFromText(e.location?.name, e.location?.address)
    // La Fête de la Musique est gratuite par essence : pas d'inférence de prix.
    const title = (pickFr(e.title) ?? '').trim()
    const description = (pickFr(e.description) ?? stripHtml(pickFr(e.longDescription) ?? '')).trim()
    const imageUrl = e.image?.base && e.image.filename ? `${e.image.base}${e.image.filename}` : null

    timings.forEach((t, idx) => {
      if (!t.begin) return
      normalized.push({
        id: `oa-${e.uid}-${idx}`,
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
        price_type: 'free',
        price_detail: null,
        description,
        image_url: imageUrl,
      })
    })
  }

  console.error(`[openagenda] ≤${RADIUS_KM}km Paris, normalisés: ${normalized.length}`)
  console.error(`[openagenda]   dropped: noCoords=${droppedNoCoords} (hors filtre Paris inclus), noTiming=${droppedNoTiming}`)
  if (unmapped.size > 0) {
    console.error(`[openagenda]   styles non mappés → 'autres': ${[...unmapped.entries()].map(([k, c]) => `${k}(${c})`).join(', ')}`)
  }
  return normalized
}
