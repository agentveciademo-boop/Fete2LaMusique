import { TIME_AXIS_MIN, TIME_AXIS_MAX, FESTIVAL_START_DATE } from './festival'

const PARIS_PARTS = new Intl.DateTimeFormat('fr-FR', {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Paris',
})

interface ParisLocal {
  date:   string  // YYYY-MM-DD
  hour:   number  // 0–23
  minute: number  // 0–59
}

function toParisLocal(input: Date | string): ParisLocal {
  const d = typeof input === 'string' ? new Date(input) : input
  const parts = PARIS_PARTS.formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  const year   = get('year')
  const month  = get('month')
  const day    = get('day')
  let hour     = parseInt(get('hour'),   10)
  const minute = parseInt(get('minute'), 10)
  // Intl can return "24" at midnight in some locales — normalise.
  if (hour === 24) hour = 0
  return { date: `${year}-${month}-${day}`, hour, minute }
}

function shiftDay(date: string, offsetDays: number): string {
  // date = YYYY-MM-DD. We anchor at 12:00 UTC to dodge DST edge cases entirely.
  const ts = new Date(`${date}T12:00:00Z`).getTime() + offsetDays * 86_400_000
  return new Date(ts).toISOString().slice(0, 10)
}

/**
 * A concert that starts Saturday 23h and ends Sunday 02h belongs to Saturday's
 * **evening session**. Map an ISO timestamp to its session date (YYYY-MM-DD).
 *
 * Rule (heure locale Europe/Paris) :
 *   - [14h, 23h59] → session = ce jour
 *   - [00h, 06h]   → session = ce jour - 1
 *   - [06h, 14h]   → session = ce jour (rare)
 */
export function getSessionDate(iso: string): string {
  const { date, hour } = toParisLocal(iso)
  if (hour < 6) return shiftDay(date, -1)
  return date
}

/**
 * Projette un timestamp sur l'axe horaire continu du week-end : nombre d'heures
 * écoulées depuis FESTIVAL_START_DATE 00h00 (Europe/Paris).
 *   - Samedi 14h  → 14
 *   - Dimanche 00h → 24
 *   - Dimanche 20h → 44
 * Valeur bornée à [TIME_AXIS_MIN, TIME_AXIS_MAX] = [0, 48].
 */
export function toWeekendAxis(iso: string): number {
  const { date, hour, minute } = toParisLocal(iso)
  const dayOffset = Math.round(
    (new Date(`${date}T12:00:00Z`).getTime() - new Date(`${FESTIVAL_START_DATE}T12:00:00Z`).getTime()) / 86_400_000,
  )
  const raw = dayOffset * 24 + hour + minute / 60
  return Math.max(TIME_AXIS_MIN, Math.min(TIME_AXIS_MAX, raw))
}

/**
 * Inverse de toWeekendAxis : une valeur d'axe (0–48) → Date réelle (Europe/Paris).
 * Utilisé pour ancrer le `referenceTime` du statut d'un concert.
 */
export function weekendAxisToDate(axis: number): Date {
  const dayOffset = Math.floor(axis / 24)
  const within    = axis - dayOffset * 24
  const hour      = Math.floor(within)
  const minute    = Math.round((within - hour) * 60)
  const anchor    = shiftDay(FESTIVAL_START_DATE, dayOffset)
  // +02:00 = Paris fin juin (CEST). Évite d'embarquer la tzdata.
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return new Date(`${anchor}T${hh}:${mm}:00+02:00`)
}

const AXIS_DAY_LABELS = ['Sam', 'Dim']

/** Format une valeur d'axe (0–48) en label "Sam 14h" / "Dim 02h". */
export function formatAxisHour(axis: number): string {
  if (axis >= TIME_AXIS_MAX) return 'Dim 24h'
  const dayIdx = Math.floor(axis / 24)
  const hour   = Math.floor(axis) % 24
  const day    = AXIS_DAY_LABELS[dayIdx] ?? 'Dim'
  return `${day} ${String(hour).padStart(2, '0')}h`
}
