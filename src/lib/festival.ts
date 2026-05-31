export const FESTIVAL_DAYS = ['2026-06-20', '2026-06-21'] as const

export type SessionDate = typeof FESTIVAL_DAYS[number]

export const SESSION_LABELS: Record<SessionDate, string> = {
  '2026-06-20': 'Sam 20',
  '2026-06-21': 'Dim 21',
}

// Origine de l'axe horaire continu : samedi 2026-06-20 00h00 (Europe/Paris).
export const FESTIVAL_START_DATE = '2026-06-20'

// Festival window (Europe/Paris) — used by the smart default in useFilters.
export const FESTIVAL_WINDOW_START = new Date('2026-06-20T00:00:00+02:00')
export const FESTIVAL_WINDOW_END   = new Date('2026-06-22T00:00:00+02:00')

// Axe horaire continu du week-end : 0 = Sam 00h, 24 = Dim 00h, 48 = Dim 24h (Lun 00h).
export const TIME_AXIS_MIN = 0
export const TIME_AXIS_MAX = 48
