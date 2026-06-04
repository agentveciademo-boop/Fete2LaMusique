/**
 * Source « Que faire à Paris » (opendata.paris.fr) → OutEvent[].
 *
 * Agenda éditorialisé par la Ville de Paris (API Opendatasoft Explore v2.1).
 * Complète OpenAgenda avec les events estampillés Paris.fr. La fusion / dédup
 * avec OpenAgenda est faite en aval par lib/dedup.ts.
 *
 * Filtre métier :
 *   - tag `Concert` (le dataset n'a PAS de tag "Fête de la Musique" dédié)
 *   - occurrence tombant sur la soirée FdM (sam 20 / dim 21 juin 2026)
 *   - price_type = gratuit  → proxy honnête : la FdM est gratuite, on écarte
 *     ainsi les concerts billetterie qui jouent ce week-end sans être la FdM.
 *     Le nombre de payants écartés est logué (à vérifier sur le réel).
 *
 * Licence ODbL : attribution « Que faire à Paris ? / Ville de Paris » requise
 * (portée côté UI via le badge source `qfap` → "Paris.fr").
 */

import {
  type Genre,
  type OutEvent,
  addHours,
  extractArrondissement,
  inferOutdoorFromText,
  inParis,
  sessionDate,
  stripHtml,
} from '../lib/normalize'

const DATASET = 'que-faire-a-paris-'
const BASE = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/${DATASET}/records`
const PAGE_SIZE = 100 // max Opendatasoft v2.1

// Soirée FdM 2026 : axe continu sam 20 → dim 21 juin (cf. frontend toWeekendAxis).
const TARGET_SESSION_DATES = new Set(
  (process.env.FDM_SESSION_DATES ?? '2026-06-20,2026-06-21').split(',').map((s) => s.trim()),
)
// Bornes de la requête API (un event est candidat s'il chevauche la fenêtre).
const WINDOW_START = [...TARGET_SESSION_DATES].sort()[0]
const WINDOW_END = [...TARGET_SESSION_DATES].sort().at(-1)!

type QfapRecord = {
  event_id?: number
  url?: string | null
  title?: string | null
  lead_text?: string | null
  description?: string | null
  occurrences?: string | null
  cover_url?: string | null
  address_name?: string | null
  address_street?: string | null
  address_zipcode?: string | null
  address_city?: string | null
  lat_lon?: { lat?: number | null; lon?: number | null } | null
  price_type?: string | null
  price_detail?: string | null
  event_indoor?: number | boolean | null
  qfap_tags?: string | null
}

async function fetchPage(offset: number): Promise<{ records: QfapRecord[]; total: number }> {
  const where = `date_start <= "${WINDOW_END}" AND date_end >= "${WINDOW_START}" AND qfap_tags LIKE "Concert"`
  const params = new URLSearchParams({
    where,
    limit: String(PAGE_SIZE),
    offset: String(offset),
    select:
      'event_id,url,title,lead_text,description,occurrences,cover_url,address_name,address_street,address_zipcode,address_city,lat_lon,price_type,price_detail,event_indoor,qfap_tags',
  })
  const url = `${BASE}?${params}`
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const data = (await res.json()) as { total_count?: number; results?: QfapRecord[] }
      return { records: data.results ?? [], total: data.total_count ?? 0 }
    } catch (e) {
      lastErr = e
      const wait = 500 * 2 ** attempt
      console.error(`  attempt ${attempt} failed (${(e as Error).message}); retry in ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

// "begin_end;begin_end;…" (heure locale Paris) → [{begin,end}]
function parseOccurrences(raw: string | null | undefined): Array<{ begin: string; end: string | null }> {
  if (!raw) return []
  const out: Array<{ begin: string; end: string | null }> = []
  for (const piece of raw.split(';')) {
    const [begin, end] = piece.split('_')
    if (begin) out.push({ begin: begin.trim(), end: end?.trim() || null })
  }
  return out
}

function isFree(priceType: string | null | undefined): boolean {
  return (priceType ?? '').toLowerCase().includes('gratuit')
}

function inferOutdoor(rec: QfapRecord): boolean | null {
  if (rec.event_indoor != null) return !rec.event_indoor // 1/true = indoor → outdoor=false
  return inferOutdoorFromText(rec.address_name, rec.address_street)
}

export async function fetchQfap(): Promise<OutEvent[]> {
  console.error(`[qfap] fetch « Que faire à Paris » (tag Concert, ${WINDOW_START}→${WINDOW_END})…`)

  const records: QfapRecord[] = []
  let offset = 0
  let total = Infinity
  while (offset < total && offset < 10_000) {
    const { records: page, total: t } = await fetchPage(offset)
    total = t
    records.push(...page)
    console.error(`[qfap]   offset ${offset}: +${page.length} (total annoncé ${t})`)
    if (page.length === 0) break
    offset += PAGE_SIZE
  }
  console.error(`[qfap] ${records.length} concerts récupérés (chevauchant la fenêtre)`)

  const normalized: OutEvent[] = []
  let droppedPaid = 0
  let droppedNoCoords = 0
  let droppedOffWindow = 0

  for (const rec of records) {
    const lat = rec.lat_lon?.lat
    const lng = rec.lat_lon?.lon
    if (lat == null || lng == null || !inParis(lat, lng)) {
      droppedNoCoords++
      continue
    }
    if (!isFree(rec.price_type)) {
      droppedPaid++
      continue
    }

    const title = (rec.title ?? '').trim()
    const venueName = (rec.address_name ?? '').trim()
    const address = [rec.address_street, rec.address_zipcode, rec.address_city].filter(Boolean).join(' ').trim()
    const description = stripHtml(rec.description || rec.lead_text || '').trim()
    const isOutdoor = inferOutdoor(rec)
    // QFAP ne porte pas de champ « genre musical » → 'autres' (pas d'invention).
    const genres: Genre[] = ['autres']

    let kept = 0
    parseOccurrences(rec.occurrences).forEach((occ, idx) => {
      const sd = sessionDate(occ.begin)
      if (!TARGET_SESSION_DATES.has(sd)) return
      kept++
      normalized.push({
        id: `qfap-${rec.event_id}-${idx}`,
        title,
        venue_name: venueName,
        address,
        arrondissement: extractArrondissement(rec.address_zipcode),
        commune: rec.address_city ?? '',
        lat,
        lng,
        start_time: occ.begin,
        end_time: occ.end ?? addHours(occ.begin, 3),
        session_date: sd,
        source: 'qfap',
        source_url: rec.url ?? null,
        // QFAP ne porte pas de champ réservation structuré → false (pas d'invention).
        requires_booking: false,
        booking_url: null,
        genres,
        subgenres: [],
        is_outdoor: isOutdoor,
        price_type: 'free',
        price_detail: rec.price_detail ?? null,
        description,
        image_url: rec.cover_url ?? null,
      })
    })
    if (kept === 0) droppedOffWindow++
  }

  console.error(`[qfap] normalisés (gratuit, soirée FdM): ${normalized.length}`)
  console.error(`[qfap]   écartés: payants=${droppedPaid}, hors Paris/sans coords=${droppedNoCoords}, hors fenêtre 20-21=${droppedOffWindow}`)
  return normalized
}
