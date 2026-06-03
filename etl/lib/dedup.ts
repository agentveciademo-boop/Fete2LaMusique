/**
 * Dédup / fusion cross-source.
 *
 * « Le vrai sujet » : un même concert peut être dans OpenAgenda ET dans Que
 * faire à Paris. On veut une seule entrée, taguée `both`, sans masquer de vrai
 * concert. Approche conservatrice — on ne fusionne que sur faisceau d'indices :
 *
 *   1. Blocking par session_date (deux dates ≠ ne peuvent pas être doublons).
 *   2. On ne compare QUE des events de sources différentes (chaque source est
 *      supposée propre en interne : OpenAgenda dédoublonne déjà par uid).
 *   3. Match si  distance ≤ 150 m  ET  |Δdébut| ≤ 90 min
 *      ET ( Jaccard(titre) ≥ 0.4  OU  Jaccard(venue) ≥ 0.5 ).
 *   4. Fusion : base = OpenAgenda (porte les genres réels), enrichie par QFAP
 *      (image, description la plus riche). source → 'both'.
 *
 * Biais assumé : on préfère un doublon visible à un vrai concert masqué
 * (faux négatif > faux positif).
 */

import { type OutEvent, haversineKm, normalizeLabel } from './normalize'

// Distance adaptative à la confiance textuelle : un même lieu géocodé
// différemment par deux sources peut être à ~200 m. Quand titre/venue matchent
// fort, on tolère plus loin ; sinon on reste strict pour éviter les faux positifs.
const MAX_DIST_METERS = 150 // match textuel faible
const MAX_DIST_METERS_STRONG = 400 // match textuel fort (titre ou venue ≥ 0.6)
const STRONG_TEXT_JACCARD = 0.6
const MAX_TIME_DIFF_MIN = 90
const MIN_TITLE_JACCARD = 0.4
const MIN_VENUE_JACCARD = 0.5

const STOPWORDS = new Set([
  'les', 'des', 'une', 'aux', 'avec', 'pour', 'dans', 'sur', 'par', 'paris',
  'concert', 'live', 'fete', 'musique', 'and', 'the', 'feat',
])

function tokens(s: string): Set<string> {
  const out = new Set<string>()
  for (const tok of normalizeLabel(s).split(/[^a-z0-9]+/)) {
    if (tok.length >= 3 && !STOPWORDS.has(tok)) out.add(tok)
  }
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

function minutesBetween(isoA: string, isoB: string): number {
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) / 60_000
}

type Match = { distM: number; timeMin: number; titleJac: number; venueJac: number }

function evaluate(a: OutEvent, b: OutEvent): Match | null {
  const timeMin = minutesBetween(a.start_time, b.start_time)
  if (timeMin > MAX_TIME_DIFF_MIN) return null
  const titleJac = jaccard(tokens(a.title), tokens(b.title))
  const venueJac = jaccard(tokens(a.venue_name), tokens(b.venue_name))
  if (titleJac < MIN_TITLE_JACCARD && venueJac < MIN_VENUE_JACCARD) return null
  const distM = haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000
  const strongText = titleJac >= STRONG_TEXT_JACCARD || venueJac >= STRONG_TEXT_JACCARD
  const maxDist = strongText ? MAX_DIST_METERS_STRONG : MAX_DIST_METERS
  if (distM > maxDist) return null
  return { distM, timeMin, titleJac, venueJac }
}

// Plus c'est haut, plus le match est sûr (sert à choisir le meilleur candidat).
function score(m: Match): number {
  return (
    m.titleJac * 2 +
    m.venueJac +
    (1 - m.distM / MAX_DIST_METERS) +
    (1 - m.timeMin / MAX_TIME_DIFF_MIN)
  )
}

function merge(base: OutEvent, other: OutEvent): OutEvent {
  // base = OpenAgenda (genres réels). On enrichit avec QFAP ce qui manque.
  const richerDescription =
    other.description.length > base.description.length ? other.description : base.description
  return {
    ...base,
    source: 'both',
    image_url: base.image_url ?? other.image_url,
    description: richerDescription,
    is_outdoor: base.is_outdoor ?? other.is_outdoor,
    price_detail: base.price_detail ?? other.price_detail,
  }
}

export type DedupResult = {
  events: OutEvent[]
  merged: number // nb de paires fusionnées (OA + QFAP → both)
}

export function dedup(all: OutEvent[]): DedupResult {
  // Blocking par session_date.
  const byDate = new Map<string, OutEvent[]>()
  for (const e of all) {
    const k = e.session_date
    if (!byDate.has(k)) byDate.set(k, [])
    byDate.get(k)!.push(e)
  }

  const result: OutEvent[] = []
  let merged = 0

  for (const group of byDate.values()) {
    const primary = group.filter((e) => e.source === 'openagenda')
    const secondary = group.filter((e) => e.source === 'qfap')
    const usedPrimary = new Set<number>()

    // Pour chaque event secondaire (QFAP), on cherche le meilleur OA libre.
    for (const sec of secondary) {
      let best = -1
      let bestScore = -Infinity
      for (let i = 0; i < primary.length; i++) {
        if (usedPrimary.has(i)) continue
        const m = evaluate(primary[i], sec)
        if (m) {
          const s = score(m)
          if (s > bestScore) {
            bestScore = s
            best = i
          }
        }
      }
      if (best >= 0) {
        usedPrimary.add(best)
        primary[best] = merge(primary[best], sec)
        merged++
      } else {
        result.push(sec) // QFAP sans correspondance → gardé tel quel
      }
    }
    // Tous les OA (fusionnés ou non) sont conservés.
    result.push(...primary)
  }

  return { events: result, merged }
}
