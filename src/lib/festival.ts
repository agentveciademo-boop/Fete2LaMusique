export const FESTIVAL_DAYS = ['2026-06-20', '2026-06-21'] as const

export type SessionDate = typeof FESTIVAL_DAYS[number]

export const SESSION_LABELS: Record<SessionDate, string> = {
  '2026-06-20': 'Sam 20',
  '2026-06-21': 'Dim 21',
}

// Festival window (Europe/Paris) — used by the smart default in useFilters.
export const FESTIVAL_WINDOW_START = new Date('2026-06-20T14:00:00+02:00')
export const FESTIVAL_WINDOW_END   = new Date('2026-06-22T06:00:00+02:00')

// Time-range slider axis: 14h on session day → 30 = 06h next morning.
export const TIME_AXIS_MIN = 14
export const TIME_AXIS_MAX = 30
