/**
 * Helpers de normalisation partagés par tous les ETL (sources/*).
 *
 * Extrait de etl/sync.ts (logique OpenAgenda) pour être réutilisé tel quel par
 * les autres sources (QFAP, …) → un seul vocabulaire de genres, une seule
 * définition du type de sortie, une seule logique géo. Comportement OpenAgenda
 * inchangé : ces fonctions sont déplacées verbatim.
 */

// ---------- Types (doivent matcher src/types/event.ts) ----------

export type Genre =
  | 'jazz' | 'rock' | 'classique' | 'electro' | 'folk' | 'rap' | 'variete'
  | 'world' | 'pop' | 'soul-funk' | 'chorale' | 'reggae' | 'fanfare' | 'trad'
  | 'blues' | 'autres'

export type PriceType = 'free' | 'paid' | 'prix_libre' | 'unknown'

export type Source = 'openagenda' | 'qfap' | 'both' | 'manuel'

export type OutEvent = {
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
  source: Source
  source_url: string | null
  requires_booking: boolean
  booking_url: string | null
  genres: Genre[]
  subgenres: string[]
  is_outdoor: boolean | null
  price_type: PriceType
  price_detail: string | null
  description: string
  image_url: string | null
  instagram: string | null
  tiktok: string | null
}

// ---------- Périmètre géographique ----------

export const PARIS_LAT = 48.8534
export const PARIS_LNG = 2.3488
export const RADIUS_KM = 10

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function inParis(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false
  return haversineKm(PARIS_LAT, PARIS_LNG, lat, lng) <= RADIUS_KM
}

// ---------- Plein air / salle ----------

const OUTDOOR_RE = /\b(rue|place|parc|jardin|square|esplanade|quai|parvis|berge|allée|allee|cour|terrasse|boulevard|avenue|promenade|kiosque|placette|halle)\b/i
const INDOOR_RE = /\b(salle|théâtre|theatre|conservatoire|bar|café|cafe|club|auditorium|église|eglise|chapelle|cinéma|cinema|médiathèque|mediatheque|bibliothèque|bibliotheque|musée|musee|galerie|brasserie|restaurant|pub|maison de quartier|centre culturel|école|ecole)\b/i

export function inferOutdoorFromText(name: string | null | undefined, address: string | null | undefined): boolean | null {
  const txt = `${name ?? ''} ${address ?? ''}`.toLowerCase().trim()
  if (!txt) return null
  const out = OUTDOOR_RE.test(txt)
  const ind = INDOOR_RE.test(txt)
  if (out && !ind) return true
  if (ind && !out) return false
  return null
}

// ---------- Texte ----------

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function extractArrondissement(pc: string | null | undefined): number | null {
  if (!pc) return null
  if (pc === '75116') return 16
  if (/^750\d{2}$/.test(pc)) {
    const n = parseInt(pc.slice(3), 10)
    if (n >= 1 && n <= 20) return n
  }
  return null
}

// Soirée bucket : un concert qui commence avant 06h appartient à la soirée de la veille.
export function sessionDate(beginIso: string): string {
  const date = beginIso.slice(0, 10)
  const hour = parseInt(beginIso.slice(11, 13), 10)
  if (Number.isFinite(hour) && hour < 6) {
    const d = new Date(`${date}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return date
}

export function addHours(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3_600_000).toISOString()
}

// ---------- Genres (labels source → genres canoniques de l'app) ----------

export const VALID_GENRES = new Set<Genre>([
  'jazz', 'rock', 'classique', 'electro', 'folk', 'rap', 'variete', 'world',
  'pop', 'soul-funk', 'chorale', 'reggae', 'fanfare', 'trad', 'blues', 'autres',
])

// Clés normalisées (minuscules, sans accents) → robuste aux variantes
// ("Hip-Hop"/"Hip-hop", "Metal"/"Métal"). Métal n'a pas de chip dédié → rock.
export const GENRE_MAP: Record<string, Genre> = {
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

export function normalizeLabel(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/**
 * Nettoyage final des genres (appliqué après fusion cross-source) :
 * - dédoublonne (une fusion OA+QFAP peut réunir des doublons) ;
 * - retire 'autres' dès qu'au moins un vrai genre est présent — le style source
 *   « Autre » n'apporte rien à côté d'un genre identifié. 'autres' n'est conservé
 *   que lorsqu'il est le SEUL genre (aucune info de style → légitime).
 */
export function pruneAutres(genres: Genre[]): Genre[] {
  const uniq = [...new Set(genres)]
  return uniq.length > 1 ? uniq.filter((g) => g !== 'autres') : uniq
}

export function parseSubgenres(raw: string | null | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const piece of raw.split(/[,;/+]|\s+et\s+|\n/i)) {
    const k = piece.trim()
    if (k.length > 1 && k.length <= 30) seen.add(k)
  }
  return [...seen].slice(0, 8)
}

// ---------- Réseaux sociaux ----------

const IG_PATH_BLACKLIST = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv', 'share'])

export function extractInstagramHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([^/?#\s]+)\/?/)
  if (!m) return null
  const handle = m[1].replace(/^@/, '').toLowerCase()
  if (IG_PATH_BLACKLIST.has(handle) || handle.length < 2) return null
  return handle
}

export function extractTikTokHandle(url: string): string | null {
  const m = url.match(/tiktok\.com\/@?([^/?#\s]+)\/?/)
  if (!m) return null
  const handle = m[1].replace(/^@/, '').toLowerCase()
  if (handle.length < 2) return null
  return handle
}

export function extractSocialFromText(text: string): { instagram: string | null; tiktok: string | null } {
  let instagram: string | null = null
  let tiktok: string | null = null
  for (const m of text.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([^/?#\s"']+)/g)) {
    const h = extractInstagramHandle(`https://instagram.com/${m[1]}`)
    if (h) { instagram = h; break }
  }
  for (const m of text.matchAll(/https?:\/\/(?:www\.)?tiktok\.com\/@?([^/?#\s"']+)/g)) {
    const h = extractTikTokHandle(`https://tiktok.com/${m[1]}`)
    if (h) { tiktok = h; break }
  }
  return { instagram, tiktok }
}
