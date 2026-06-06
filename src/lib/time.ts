export const SLIDER_START = new Date('2026-06-21T12:00:00+02:00')
export const SLIDER_END   = new Date('2026-06-22T02:00:00+02:00')
export const SLIDER_MINUTES_MAX = 840 // 14h * 60

// Default position hors festival : 19h00, cœur de soirée (beaucoup d'events visibles).
// Évite d'atterrir sur 12h00 / sur l'event le plus tôt → carte quasi vide.
export const SLIDER_DEFAULT_TIME = new Date('2026-06-21T19:00:00+02:00')

// Force Europe/Paris everywhere so server (UTC) and client render the same string —
// otherwise hydration mismatches → React error #418 + RangeError downstream.
const PARIS_HHMM = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Paris',
})

function formatParisHHmm(date: Date): string {
  if (Number.isNaN(date.getTime())) return '--h--'
  const parts = PARIS_HHMM.formatToParts(date)
  const h = parts.find(p => p.type === 'hour')?.value   ?? '00'
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${h}h${m}`
}

export function minutesToDate(minutes: number): Date {
  return new Date(SLIDER_START.getTime() + minutes * 60_000)
}

export function dateToMinutes(date: Date): number {
  return Math.round((date.getTime() - SLIDER_START.getTime()) / 60_000)
}

export function clampToSliderRange(date: Date): Date {
  if (date < SLIDER_START) return new Date('2026-06-21T19:00:00+02:00')
  if (date > SLIDER_END)   return new Date('2026-06-21T19:00:00+02:00')
  return date
}

// Pick a useful slider default given the current moment.
// - During festival window → real now (let the user see what's happening live).
// - Otherwise → 19h00, le cœur du festival, là où la carte est la plus dense.
export function pickDefaultSliderTime(now: Date): Date {
  if (now >= SLIDER_START && now <= SLIDER_END) return now
  return SLIDER_DEFAULT_TIME
}

// Override "now" via ?now=ISO URL param (dev / testing — simuler le 21 juin sans toucher l'horloge).
// SSR-safe : sans window, retourne new Date(). Param invalide → fallback new Date().
export function getNow(): Date {
  if (typeof window === 'undefined') return new Date()
  const param = new URLSearchParams(window.location.search).get('now')
  if (!param) return new Date()
  const d = new Date(param)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export function formatSliderLabel(date: Date): string {
  return formatParisHHmm(date)
}

export function formatEventTime(isoString: string): string {
  return formatParisHHmm(new Date(isoString))
}

// Variante « horloge » à deux-points (16:00, 21:47) — utilisée par les écrans de la
// refonte (mono Space Mono). Distincte de formatEventTime qui rend « 16h00 ».
const PARIS_CLOCK = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris',
})

export function formatClock(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '--:--'
  const parts = PARIS_CLOCK.formatToParts(d)
  const h = parts.find(p => p.type === 'hour')?.value   ?? '00'
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${h}:${m}`
}
