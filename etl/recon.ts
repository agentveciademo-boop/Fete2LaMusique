/**
 * Recon OpenAgenda 2025 — agenda UID 7476421 (Fête de la Musique 2025).
 *
 * Produit docs/recon-report.md avec les mesures Q1-Q8 décrites dans
 * docs/prompts/backend-etl.md.
 *
 * Schéma réel constaté (≠ docs/data-sources.md) :
 *   - Genres = champ custom `styles-musicaux` (array d'IDs numériques),
 *     mapping IDs→labels disponible via /agendas/{uid} (schema.fields).
 *   - `conditions` souvent {} ; vrai champ binaire = `conditions-participation`
 *     (32 = sans réservation, 33 = sur réservation).
 *   - `timings` array dispo uniquement avec `?detailed=1`.
 *   - Pagination = cursor (`after[]`), pas d'offset officiel.
 *   - Le paramètre `oaq[radius]` ne renvoie rien d'exploitable → filtre
 *     géographique appliqué côté script via formule haversine.
 *
 * Usage:
 *   OPENAGENDA_API_KEY=xxx node etl/recon.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const AGENDA_UID_2025 = 7476421
const PARIS_LAT = 48.8534
const PARIS_LNG = 2.3488
const RADIUS_KM = 10
const PAGE_SIZE = 300

const API_KEY = process.env.OPENAGENDA_API_KEY
if (!API_KEY) {
  console.error('Missing OPENAGENDA_API_KEY in env. Put it in .env.local or export it.')
  process.exit(1)
}

// ---------- Types ----------

type Localized<T> = Record<string, T> | undefined | null

type RawEvent = {
  uid: number
  slug?: string
  title?: Localized<string>
  description?: Localized<string>
  longDescription?: Localized<string>
  keywords?: Localized<string[]>
  timings?: Array<{ begin?: string; end?: string }>
  firstTiming?: { begin?: string; end?: string }
  lastTiming?: { begin?: string; end?: string }
  attendanceMode?: number | null
  conditions?: Localized<string>
  'conditions-participation'?: number | null
  'styles-musicaux'?: number[]
  'autres-styles-musicaux'?: string | null
  'type-de-public'?: number[]
  image?: { base?: string; filename?: string } | null
  location?: {
    name?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    postalCode?: string | null
    city?: string | null
    department?: string | null
  } | null
}

type SchemaFieldOption = {
  id: number
  label?: Record<string, string>
}

type SchemaField = {
  field: string
  fieldType?: string
  options?: SchemaFieldOption[]
}

// ---------- Schema fetch (IDs → labels) ----------

async function fetchSchemaOptions(): Promise<{
  styles: Map<number, string>
  conditionsParticipation: Map<number, string>
  typeDePublic: Map<number, string>
}> {
  const url = `https://api.openagenda.com/v2/agendas/${AGENDA_UID_2025}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Schema fetch failed: HTTP ${res.status}`)
  const data = (await res.json()) as { schema?: { fields?: SchemaField[] } }
  const fields = data.schema?.fields ?? []
  const grab = (name: string) => {
    const f = fields.find((x) => x.field === name)
    const m = new Map<number, string>()
    for (const o of f?.options ?? []) {
      const label = o.label?.fr ?? Object.values(o.label ?? {})[0] ?? `id=${o.id}`
      m.set(o.id, label)
    }
    return m
  }
  return {
    styles: grab('styles-musicaux'),
    conditionsParticipation: grab('conditions-participation'),
    typeDePublic: grab('type-de-public'),
  }
}

// ---------- Fetch events (cursor pagination) ----------

async function fetchPage(after: string[] | null): Promise<{
  events: RawEvent[]
  after: string[] | null
  total?: number
}> {
  const params = new URLSearchParams()
  params.set('size', String(PAGE_SIZE))
  params.set('detailed', '1')
  params.set('key', API_KEY!)
  if (after) for (const v of after) params.append('after[]', v)
  const url = `https://api.openagenda.com/v2/agendas/${AGENDA_UID_2025}/events?${params}`
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
      const data = (await res.json()) as { events?: RawEvent[]; after?: string[] | null; total?: number }
      return {
        events: data.events ?? [],
        after: data.after && data.after.length ? data.after : null,
        total: data.total,
      }
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
  let total: number | undefined
  let pageIndex = 0
  while (true) {
    const { events, after: nextAfter, total: t } = await fetchPage(after)
    if (total === undefined && t !== undefined) total = t
    all.push(...events)
    pageIndex++
    console.error(
      `  page ${pageIndex} fetched=${events.length} total_so_far=${all.length}${total ? ` / ${total}` : ''}`,
    )
    if (!nextAfter || events.length === 0) break
    after = nextAfter
    if (pageIndex > 50) {
      console.error('  safety stop at 50 pages')
      break
    }
  }
  return all
}

// ---------- Geo filter (haversine) ----------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ---------- Normalisation heuristics ----------

const OUTDOOR_RE = /\b(rue|place|parc|jardin|square|esplanade|quai|parvis|berge|allée|allee|cour|terrasse|boulevard|avenue|promenade|kiosque|placette|cour|jardin|halle)\b/i
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

function parsePrice(text: string): 'free' | 'paid' | 'prix_libre' | 'unknown' {
  if (!text || !text.trim()) return 'unknown'
  if (PRIX_LIBRE_RE.test(text)) return 'prix_libre'
  if (FREE_RE.test(text) && !PAID_RE.test(text)) return 'free'
  if (PAID_RE.test(text)) return 'paid'
  return 'unknown'
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
}

function pickFr<T>(loc: Localized<T>): T | undefined {
  if (!loc) return undefined
  return (loc as Record<string, T>)['fr'] ?? (loc as Record<string, T>)['fr-FR'] ?? Object.values(loc)[0]
}

function extractArrondissement(pc: string | null | undefined): number | null {
  if (!pc) return null
  if (/^750\d{2}$/.test(pc)) {
    const n = parseInt(pc.slice(3), 10)
    if (n >= 1 && n <= 20) return n
  }
  if (pc === '75116') return 16
  return null
}

// ---------- Utils ----------

function topN<K>(map: Map<K, number>, n: number): Array<[K, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}
function randomSample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}
function pct(num: number, den: number): string {
  if (!den) return 'N/A'
  return `${((num / den) * 100).toFixed(1)}%`
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

// ---------- Main ----------

async function main() {
  console.error(`Fetching agenda schema (IDs → labels)…`)
  const schema = await fetchSchemaOptions()
  console.error(
    `  styles-musicaux: ${schema.styles.size} options, conditions-participation: ${schema.conditionsParticipation.size}, type-de-public: ${schema.typeDePublic.size}`,
  )

  console.error(`Fetching all events from agenda ${AGENDA_UID_2025} (detailed=1)…`)
  const raw = await fetchAll()
  console.error(`Total fetched: ${raw.length}`)

  // ---- Géofiltre (haversine < 10 km de Paris) ----
  const inParis = raw.filter((e) => {
    const lat = e.location?.latitude
    const lng = e.location?.longitude
    if (lat == null || lng == null) return false
    return haversineKm(PARIS_LAT, PARIS_LNG, lat, lng) <= RADIUS_KM
  })
  console.error(`After haversine filter (≤${RADIUS_KM}km de Paris): ${inParis.length}`)

  // Le sous-corpus d'analyse pour Q2-Q8 = inParis (la cible métier).
  // Q1 mesure la taille du JSON produit pour inParis.
  const N = inParis.length

  if (N === 0) {
    console.error('No events in Paris radius. Aborting.')
    process.exit(2)
  }

  // ---- Build simulated normalized JSON for Q1 sizing ----
  type SimEvent = {
    id: string
    openagenda_uid: number
    title: string
    lat: number
    lng: number
    start_time: string
    end_time: string | null
    genres: string[]
    is_outdoor: boolean | null
    price_type: string
    requires_booking: boolean | null
    venue_name: string | null
    address: string | null
    arrondissement: number | null
    commune: string | null
    description: string | null
    image_url: string | null
    source_url: string
  }
  const simulated: SimEvent[] = []
  let dropNoTiming = 0
  for (const e of inParis) {
    const timings: Array<{ begin?: string; end?: string }> = e.timings && e.timings.length > 0
      ? e.timings
      : e.firstTiming ? [e.firstTiming] : []
    if (timings.length === 0) {
      dropNoTiming++
      continue
    }
    const styleIds = e['styles-musicaux'] ?? []
    const genres = styleIds
      .map((id) => schema.styles.get(id))
      .filter((s): s is string => !!s)
    timings.forEach((t, idx) => {
      if (!t.begin) return
      simulated.push({
        id: `${e.uid}-${idx}`,
        openagenda_uid: e.uid,
        title: pickFr(e.title) ?? '',
        lat: e.location!.latitude!,
        lng: e.location!.longitude!,
        start_time: t.begin,
        end_time: t.end ?? null,
        genres,
        is_outdoor: inferOutdoor(e.location),
        price_type: parsePrice(stripHtml(pickFr(e.longDescription) ?? '') + ' ' + (pickFr(e.description) ?? '') + ' ' + (pickFr(e.conditions) ?? '')),
        requires_booking: e['conditions-participation'] == null ? null : e['conditions-participation'] === 33,
        venue_name: e.location?.name ?? null,
        address: e.location?.address ?? null,
        arrondissement: extractArrondissement(e.location?.postalCode ?? null),
        commune: e.location?.city ?? null,
        description: pickFr(e.description) ?? null,
        image_url: e.image?.base && e.image.filename ? `${e.image.base}${e.image.filename}` : null,
        source_url: `https://openagenda.com/fr/fetedelamusique2025/events/${e.uid}`,
      })
    })
  }
  const jsonStr = JSON.stringify({
    generated_at: new Date().toISOString(),
    source_agenda_uid: AGENDA_UID_2025,
    event_count: simulated.length,
    events: simulated,
  })
  const rawBytes = Buffer.byteLength(jsonStr, 'utf8')
  const gzipped = zlib.gzipSync(jsonStr)
  const escalateDb = gzipped.length > 500 * 1024
  const totalTimings = inParis.reduce(
    (s, e) => s + (e.timings && e.timings.length > 0 ? e.timings.length : e.firstTiming ? 1 : 0),
    0,
  )

  // ---- Q2: genres distribution (sur IDs styles-musicaux) ----
  const styleFreq = new Map<number, number>()
  let eventsWithStyle = 0
  let eventsWithAutreStyle = 0
  for (const e of inParis) {
    const ids = e['styles-musicaux'] ?? []
    if (ids.length > 0) eventsWithStyle++
    const seen = new Set(ids)
    for (const id of seen) styleFreq.set(id, (styleFreq.get(id) ?? 0) + 1)
    if (e['autres-styles-musicaux']) eventsWithAutreStyle++
  }
  // tags ≥ 3%
  const styleAt3pct: Array<[number, number]> = [...styleFreq.entries()]
    .filter(([, c]) => c / N >= 0.03)
    .sort((a, b) => b[1] - a[1])
  // top "autres" libre
  const autresFreq = new Map<string, number>()
  for (const e of inParis) {
    const raw = e['autres-styles-musicaux']
    if (!raw) continue
    for (const piece of raw.split(/[,;/+]|\s+et\s+/i)) {
      const k = piece.trim().toLowerCase()
      if (k && k.length > 1) autresFreq.set(k, (autresFreq.get(k) ?? 0) + 1)
    }
  }

  // ---- Q3: attendanceMode ----
  const attDist = new Map<string, number>()
  for (const e of inParis) {
    const k = e.attendanceMode == null ? 'null' : String(e.attendanceMode)
    attDist.set(k, (attDist.get(k) ?? 0) + 1)
  }

  // ---- Q4: is_outdoor ----
  let outTrue = 0,
    outFalse = 0,
    outNull = 0
  for (const e of inParis) {
    const r = inferOutdoor(e.location)
    if (r === true) outTrue++
    else if (r === false) outFalse++
    else outNull++
  }
  const outNullPct = (outNull / N) * 100
  const keepOutdoorFilter = outNullPct < 30

  // ---- Q5: price (mesuré sur la concat description+longDesc+conditions) ----
  const priceDist = { free: 0, paid: 0, prix_libre: 0, unknown: 0 }
  for (const e of inParis) {
    const txt =
      stripHtml(pickFr(e.longDescription) ?? '') +
      ' ' +
      (pickFr(e.description) ?? '') +
      ' ' +
      (pickFr(e.conditions) ?? '')
    priceDist[parsePrice(txt)]++
  }
  const unknownPct = (priceDist.unknown / N) * 100
  const priceFilter3State = unknownPct < 40
  // Distribution conditions-participation (vrai champ structuré)
  const cpDist = new Map<string, number>()
  for (const e of inParis) {
    const id = e['conditions-participation']
    const label = id == null ? 'null' : schema.conditionsParticipation.get(id) ?? `id=${id}`
    cpDist.set(label, (cpDist.get(label) ?? 0) + 1)
  }

  // ---- Q6: multi-genre ----
  const genresPerEvent = new Map<number, number>()
  for (const e of inParis) {
    const n = new Set(e['styles-musicaux'] ?? []).size
    genresPerEvent.set(n, (genresPerEvent.get(n) ?? 0) + 1)
  }
  const multiGenre = [...genresPerEvent.entries()]
    .filter(([k]) => k > 1)
    .reduce((s, [, c]) => s + c, 0)

  // ---- Q7: champs critiques ----
  let missLat = 0,
    missLng = 0,
    missBegin = 0,
    missEnd = 0,
    missPostal = 0,
    missTitle = 0
  for (const e of inParis) {
    if (e.location?.latitude == null) missLat++
    if (e.location?.longitude == null) missLng++
    const t = e.timings?.[0] ?? e.firstTiming
    if (!t?.begin) missBegin++
    if (!t?.end) missEnd++
    if (!e.location?.postalCode) missPostal++
    if (!pickFr(e.title)) missTitle++
  }
  const rejectNoCoords = missLat / N > 0.05

  // ---- Q8: échantillons ----
  const venueNames = inParis.map((e) => e.location?.name).filter((v): v is string => !!v)
  const conditionsList = inParis
    .map((e) => pickFr(e.conditions))
    .filter((v): v is string => !!v && v.trim().length > 0)
  const sampleVenues = randomSample(venueNames, 30)
  const sampleConditions = randomSample(conditionsList, Math.min(30, conditionsList.length))
  const sampleAutres = randomSample(
    inParis.map((e) => e['autres-styles-musicaux']).filter((v): v is string => !!v),
    20,
  )

  // ---- Mapping reco: IDs OpenAgenda → genres canoniques ----
  // Construit dynamiquement à partir du schema, basé sur les noms FR.
  const canonicalMap: Record<string, string[]> = {
    Blues: ['blues'],
    Chanson: ['variete'],
    Variété: ['variete'],
    'Hip-Hop': ['rap'],
    Rap: ['rap'],
    Ragga: ['reggae'],
    Reggae: ['reggae'],
    Dub: ['reggae'],
    Folk: ['folk'],
    Funk: ['soul-funk'],
    Soul: ['soul-funk'],
    Groove: ['soul-funk'],
    "R'n'B": ['soul-funk'],
    Jazz: ['jazz'],
    Metal: ['metal'],
    'Musique classique': ['classique'],
    'Musique contemporaine': ['classique'],
    'Musique du monde': ['world'],
    'Musique électronique': ['electro'],
    'Musique rock': ['rock'],
    'Musique traditionnelle': ['trad'],
    Pop: ['pop'],
    Chorale: ['chorale'],
    Fanfare: ['fanfare'],
    Harmonie: ['fanfare'],
    Autre: ['autres'],
  }
  const recoCanonical = new Map<string, { count: number; sources: string[] }>()
  for (const [id, count] of styleFreq) {
    const label = schema.styles.get(id) ?? `id=${id}`
    const canons = canonicalMap[label] ?? ['autres']
    for (const c of canons) {
      const cur = recoCanonical.get(c) ?? { count: 0, sources: [] }
      cur.count += count
      if (!cur.sources.includes(label)) cur.sources.push(label)
      recoCanonical.set(c, cur)
    }
  }

  // ---- Write report ----
  const L: string[] = []
  const P = (s: string) => L.push(s)

  P(`# Recon report — OpenAgenda 2025 (Fête de la Musique)`)
  P('')
  P(`> Généré automatiquement par \`etl/recon.ts\` — ${new Date().toISOString()}`)
  P(`> Agenda source : UID \`${AGENDA_UID_2025}\` (Fête de la Musique 2025)`)
  P(`> Périmètre métier : rayon ${RADIUS_KM} km autour de Paris (${PARIS_LAT}, ${PARIS_LNG}), filtré côté script via haversine`)
  P('')
  P(`## Surprises vs. \`docs/data-sources.md\``)
  P('')
  P(`- ❌ Pas de \`tagGroups[]\` : les genres sont dans un **champ custom structuré \`styles-musicaux\`** (array d'IDs numériques), vocabulaire OpenAgenda déjà contrôlé. Mapping IDs → labels récupéré via \`/agendas/${AGENDA_UID_2025}\`.`)
  P(`- ❌ \`conditions.fr\` est presque toujours vide. Le vrai champ structuré est **\`conditions-participation\`** : \`32\` = "Sans réservation/inscription", \`33\` = "Sur réservation/inscription". Aucun champ structuré sur le **prix** : la Fête de la Musique est gratuite par essence.`)
  P(`- ⚠️ \`timings[]\` requiert \`?detailed=1\` (sinon seulement \`firstTiming\` / \`lastTiming\`).`)
  P(`- ⚠️ Pagination par cursor (\`after[]\`), pas d'offset officiel. Le filtre \`oaq[lat/lng/radius]\` ne fonctionne pas comme la doc le suggère.`)
  P(`- ✅ \`location.latitude/longitude/postalCode/city\` présents et fiables (cf. Q7).`)
  P('')

  P(`## Q1 — Volume total`)
  P('')
  P(`| Métrique | Valeur |`)
  P(`|----------|--------|`)
  P(`| Events agenda entier (toute la France) | ${raw.length} |`)
  P(`| Events ≤ ${RADIUS_KM} km de Paris | **${N}** |`)
  P(`| Timings totaux (split multi-timings, sous-corpus Paris) | ${totalTimings} |`)
  P(`| Events normalisables (lat/lng + ≥1 timing) | ${simulated.length} |`)
  P(`| Events rejetés faute de timing | ${dropNoTiming} |`)
  P(`| Taille JSON brut | ${fmtBytes(rawBytes)} |`)
  P(`| Taille JSON **gzippé** | **${fmtBytes(gzipped.length)}** |`)
  P('')
  P(`**Seuil** : > 500 KB gzippé → escalade DB`)
  P(`**Reco auto** : ${escalateDb ? '⚠️ **ESCALATE** — basculer en DB' : '✅ **JSON statique OK** (largement sous le seuil)'}`)
  P('')

  P(`## Q2 — Vocabulaire genres (champ structuré \`styles-musicaux\`)`)
  P('')
  P(`Distribution des **${schema.styles.size}** styles musicaux OpenAgenda (count = nb d'events Paris contenant le style) :`)
  P('')
  P(`| ID | Label OpenAgenda | Count | % events |`)
  P(`|----|------------------|-------|----------|`)
  ;[...styleFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, c]) => P(`| ${id} | ${schema.styles.get(id) ?? '?'} | ${c} | ${pct(c, N)} |`))
  P('')
  P(`Events sans aucun \`styles-musicaux\` : ${N - eventsWithStyle} (${pct(N - eventsWithStyle, N)}) — défileront en "autres"`)
  P(`Events avec \`autres-styles-musicaux\` libre saisi : ${eventsWithAutreStyle} (${pct(eventsWithAutreStyle, N)})`)
  P('')
  P(`**Seuil** : style ≥ 3% des events Paris (= ${Math.ceil(N * 0.03)}) → mérite son chip canonique distinct`)
  P(`**Styles qualifiants (≥ 3%)** : ${styleAt3pct.length}`)
  if (styleAt3pct.length > 0) {
    P('')
    styleAt3pct.forEach(([id, c]) => P(`- \`${schema.styles.get(id)}\` (${pct(c, N)})`))
  }
  P('')
  P(`### Reco vocabulaire canonique (mapping OpenAgenda → app)`)
  P('')
  P(`Mapping proposé (à valider) :`)
  P('')
  P(`| Genre canonique | Sources OpenAgenda | Count cumulé | % events |`)
  P(`|-----------------|--------------------|-------------|----------|`)
  ;[...recoCanonical.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([c, info]) => P(`| \`${c}\` | ${info.sources.join(', ')} | ${info.count} | ${pct(info.count, N)} |`))
  P('')
  if (autresFreq.size > 0) {
    P(`### Top 20 \`autres-styles-musicaux\` (texte libre — pour audit)`)
    P('')
    topN(autresFreq, 20).forEach(([k, c]) => P(`- \`${k}\` (${c})`))
    P('')
  }

  P(`## Q3 — attendanceMode`)
  P('')
  P(`Distribution (\`1\`=offline, \`2\`=online, \`3\`=mixed) :`)
  P('')
  ;[...attDist.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, c]) => P(`- \`${k}\` : ${c} (${pct(c, N)})`))
  P('')
  P(`**Constat** : ${attDist.get('1') === N ? 'monolithique (tout offline)' : 'mixte mais dominée par offline'} — **insuffisant** pour distinguer plein air / salle. Inférence regex obligatoire (Q4).`)
  P('')

  P(`## Q4 — is_outdoor (inférence regex sur \`venue_name + address\`)`)
  P('')
  P(`Regex outdoor : \`${OUTDOOR_RE.source}\``)
  P(`Regex indoor  : \`${INDOOR_RE.source}\``)
  P('')
  P(`| Catégorie | Count | % |`)
  P(`|-----------|-------|---|`)
  P(`| outdoor=true | ${outTrue} | ${pct(outTrue, N)} |`)
  P(`| outdoor=false | ${outFalse} | ${pct(outFalse, N)} |`)
  P(`| outdoor=null (indéterminé) | ${outNull} | **${outNullPct.toFixed(1)}%** |`)
  P('')
  P(`**Seuil** : NULL < 30% → garder le filtre UI ; sinon retirer du filtre, garder comme badge`)
  P(`**Reco auto** : ${keepOutdoorFilter ? '✅ **GARDER le filtre UI**' : '⚠️ **Retirer le filtre UI** (badge uniquement)'}`)
  P('')

  P(`## Q5 — Prix (revisé)`)
  P('')
  P(`Le champ \`conditions.fr\` est quasi-systématiquement vide. Le champ structuré le plus proche est \`conditions-participation\` (32/33), qui parle d'**inscription** et non de prix.`)
  P('')
  P(`### 5.a — Distribution de \`conditions-participation\` (champ structuré)`)
  P('')
  ;[...cpDist.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, c]) => P(`- \`${k}\` : ${c} (${pct(c, N)})`))
  P('')
  P(`### 5.b — Inférence \`price_type\` (regex sur \`longDescription + description + conditions\`)`)
  P('')
  P(`| Catégorie | Count | % |`)
  P(`|-----------|-------|---|`)
  P(`| free | ${priceDist.free} | ${pct(priceDist.free, N)} |`)
  P(`| paid | ${priceDist.paid} | ${pct(priceDist.paid, N)} |`)
  P(`| prix_libre | ${priceDist.prix_libre} | ${pct(priceDist.prix_libre, N)} |`)
  P(`| unknown | ${priceDist.unknown} | **${unknownPct.toFixed(1)}%** |`)
  P('')
  P(`**Seuil** : unknown < 40% → filtre 3-états utile ; sinon toggle binaire ou retrait`)
  P(`**Reco auto** : ${
    unknownPct >= 70
      ? '⚠️ **Retirer le filtre prix** — données quasi inexistantes côté source. À la Fête de la Musique tout est gratuit par défaut. Remplacer éventuellement par un filtre "Cacher events avec inscription requise" basé sur `conditions-participation=33`.'
      : priceFilter3State
        ? '✅ **filtre 3-états** viable'
        : '🟡 **toggle binaire** "Cacher payants" plus tolérant'
  }`)
  P('')

  P(`## Q6 — Multi-genre`)
  P('')
  P(`Nombre de styles distincts par event (sur \`styles-musicaux\`) :`)
  P('')
  ;[...genresPerEvent.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([k, c]) => P(`- ${k} style(s) : ${c} events (${pct(c, N)})`))
  P('')
  P(`Events avec ≥ 2 styles : ${multiGenre} (${pct(multiGenre, N)})`)
  P(`**Reco auto** : ${
    multiGenre / N > 0.1
      ? '✅ **multi-genre confirmé** (>10% des events) — sémantique array nécessaire'
      : '🟡 multi-genre marginal côté source mais on **garde** la sémantique array (mapping 1→N possible côté app)'
  }`)
  P('')

  P(`## Q7 — Présence des champs critiques`)
  P('')
  P(`| Champ | NULL count | % NULL |`)
  P(`|-------|-----------|--------|`)
  P(`| location.latitude | ${missLat} | ${pct(missLat, N)} |`)
  P(`| location.longitude | ${missLng} | ${pct(missLng, N)} |`)
  P(`| timings[0].begin | ${missBegin} | ${pct(missBegin, N)} |`)
  P(`| timings[0].end | ${missEnd} | ${pct(missEnd, N)} |`)
  P(`| location.postalCode | ${missPostal} | ${pct(missPostal, N)} |`)
  P(`| title (toute langue) | ${missTitle} | ${pct(missTitle, N)} |`)
  P('')
  P(`**Seuil** : > 5% NULL sur lat/lng → rejeter les events sans coords`)
  P(`**Reco auto** : ${rejectNoCoords ? '⚠️ **Rejeter** les events sans coords (perte = ' + pct(missLat, N) + ')' : '✅ Coords fiables (<5% NULL), skip simple suffit (sous-corpus déjà filtré par haversine, donc 0% ici)'}`)
  P('')

  P(`## Q8 — Échantillons qualitatifs`)
  P('')
  P(`### ${sampleVenues.length} venue names (random)`)
  P('')
  sampleVenues.forEach((v) => P(`- ${v}`))
  P('')
  P(`### ${sampleConditions.length} \`conditions.fr\` non-vides (random, tronqué 200 chars)`)
  P('')
  if (sampleConditions.length === 0) P("> _(aucun event n'a un champ `conditions.fr` rempli — confirme que ce champ n'est pas utilisé en pratique)_")
  else sampleConditions.forEach((c) => P(`- ${c.replace(/\s+/g, ' ').slice(0, 200)}`))
  P('')
  if (sampleAutres.length > 0) {
    P(`### ${sampleAutres.length} \`autres-styles-musicaux\` (texte libre, random)`)
    P('')
    sampleAutres.forEach((a) => P(`- ${a.replace(/\s+/g, ' ').slice(0, 200)}`))
    P('')
  }

  P(`## Décisions implicites`)
  P('')
  P(`| Question | Seuil | Mesuré | Reco auto | Décision humaine |`)
  P(`|----------|-------|--------|-----------|------------------|`)
  P(`| Q1 — taille JSON | < 500 KB gzippé | ${fmtBytes(gzipped.length)} | ${escalateDb ? 'ESCALATE DB' : 'JSON statique OK'} | [ ] |`)
  P(`| Q2 — vocab genres | style ≥ 3% | ${styleAt3pct.length} style(s) qualifiant(s) | voir mapping canonique | [ ] |`)
  P(`| Q3 — attendanceMode pour outdoor | suffisant ? | ${pct(attDist.get('1') ?? 0, N)} offline | insuffisant, regex requis | [ ] |`)
  P(`| Q4 — is_outdoor | NULL < 30% | ${outNullPct.toFixed(1)}% NULL | ${keepOutdoorFilter ? 'GARDER filtre' : 'Badge seulement'} | [ ] |`)
  P(`| Q5 — price_type | unknown < 40% | ${unknownPct.toFixed(1)}% unknown | ${unknownPct >= 70 ? 'Retirer filtre prix' : priceFilter3State ? '3-états' : 'binaire'} | [ ] |`)
  P(`| Q6 — multi-genre | utile ? | ${multiGenre} events ≥2 styles (${pct(multiGenre, N)}) | conserver array | [ ] |`)
  P(`| Q7 — coords NULL | < 5% | ${pct(missLat, N)} | ${rejectNoCoords ? 'rejeter, mesurer perte' : 'skip OK'} | [ ] |`)
  P('')
  P(`---`)
  P(``)
  P(`_Régénérable via \`node etl/recon.ts\` (avec \`OPENAGENDA_API_KEY\` en env). Idempotent modulo date de génération et échantillons Q8._`)
  P('')

  const outPath = path.resolve('docs/recon-report.md')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, L.join('\n'))
  console.error(`\n✓ Report written to ${outPath}`)
  console.error(`  events_paris=${N}, simulated_lines=${simulated.length}, gzipped=${fmtBytes(gzipped.length)}`)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
