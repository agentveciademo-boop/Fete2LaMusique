import { TIME_AXIS_MIN, TIME_AXIS_MAX } from './festival'

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
 * Convert an event timestamp into a position on the session axis [14, 30],
 * relative to a given session date. An event of Saturday's evening starting
 * at 23h returns 23; ending at 02h next day returns 26.
 *
 * Returns a value clamped to [TIME_AXIS_MIN, TIME_AXIS_MAX] (16h window).
 */
export function toSessionAxis(iso: string, sessionDate: string): number {
  const { date, hour, minute } = toParisLocal(iso)
  const dayOffset = date === sessionDate ? 0 : 24
  const raw = hour + minute / 60 + dayOffset
  return Math.max(TIME_AXIS_MIN, Math.min(TIME_AXIS_MAX, raw))
}

/**
 * Anchor a session axis value (14–30) back to a real Date in Europe/Paris.
 * Used to derive a `referenceTime` for the event-status display.
 */
export function axisToDate(sessionDate: string, axis: number): Date {
  const dayOffset = axis >= 24 ? 1 : 0
  const hour    = Math.floor(axis - dayOffset * 24)
  const minute  = Math.round((axis - dayOffset * 24 - hour) * 60)
  const anchor  = shiftDay(sessionDate, dayOffset)
  // +02:00 is correct for Paris in late June (CEST). Avoids pulling in tzdata.
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return new Date(`${anchor}T${hh}:${mm}:00+02:00`)
}

/** Format an axis value (14–30) as a label like "19h" / "02h". */
export function formatAxisHour(axis: number): string {
  const h = Math.floor(axis) % 24
  return `${String(h).padStart(2, '0')}h`
}
