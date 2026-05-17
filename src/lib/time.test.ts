import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SLIDER_START,
  SLIDER_END,
  SLIDER_MINUTES_MAX,
  SLIDER_DEFAULT_TIME,
  minutesToDate,
  dateToMinutes,
  clampToSliderRange,
  formatSliderLabel,
  formatEventTime,
  pickDefaultSliderTime,
  getNow,
} from './time'

describe('formatSliderLabel — TZ-independent (regression: React #418 hydration mismatch)', () => {
  // These tests pass regardless of the host's TZ because the formatter is pinned to Europe/Paris.
  // The CI runs them with TZ=UTC to mirror Vercel's serverless environment.
  it('renders 19h00 for 21 June 2026 19:00 Paris time', () => {
    expect(formatSliderLabel(new Date('2026-06-21T19:00:00+02:00'))).toBe('19h00')
  })
  it('renders 00h30 for 22 June 2026 00:30 Paris time', () => {
    expect(formatSliderLabel(new Date('2026-06-22T00:30:00+02:00'))).toBe('00h30')
  })
  it('renders 12h00 for SLIDER_START', () => {
    expect(formatSliderLabel(SLIDER_START)).toBe('12h00')
  })
  it('renders 02h00 for SLIDER_END (next day)', () => {
    expect(formatSliderLabel(SLIDER_END)).toBe('02h00')
  })
  it('returns placeholder for an invalid Date instead of throwing', () => {
    expect(formatSliderLabel(new Date('not-a-date'))).toBe('--h--')
  })
})

describe('formatEventTime — TZ-independent', () => {
  it('formats an ISO string with timezone offset', () => {
    expect(formatEventTime('2026-06-21T21:30:00+02:00')).toBe('21h30')
  })
  it('formats midnight crossover correctly', () => {
    expect(formatEventTime('2026-06-22T01:15:00+02:00')).toBe('01h15')
  })
})

describe('minutesToDate / dateToMinutes', () => {
  it('round-trips: 0 → SLIDER_START', () => {
    expect(dateToMinutes(minutesToDate(0))).toBe(0)
  })
  it('round-trips: SLIDER_MINUTES_MAX → SLIDER_END', () => {
    expect(dateToMinutes(minutesToDate(SLIDER_MINUTES_MAX))).toBe(SLIDER_MINUTES_MAX)
    expect(minutesToDate(SLIDER_MINUTES_MAX).getTime()).toBe(SLIDER_END.getTime())
  })
  it('420 minutes = 7h after SLIDER_START = 19h00 Paris', () => {
    expect(formatSliderLabel(minutesToDate(420))).toBe('19h00')
  })
})

describe('pickDefaultSliderTime', () => {
  it('returns now when now is during the festival window', () => {
    const now = new Date('2026-06-21T20:30:00+02:00')
    expect(pickDefaultSliderTime(now).getTime()).toBe(now.getTime())
  })
  it('returns 19h00 (SLIDER_DEFAULT_TIME) when now is before the festival', () => {
    const beforeFestival = new Date('2026-05-17T10:00:00+02:00')
    expect(formatSliderLabel(pickDefaultSliderTime(beforeFestival))).toBe('19h00')
    expect(pickDefaultSliderTime(beforeFestival).getTime()).toBe(SLIDER_DEFAULT_TIME.getTime())
  })
  it('returns 19h00 when now is after the festival', () => {
    const afterFestival = new Date('2027-01-01T12:00:00+02:00')
    expect(formatSliderLabel(pickDefaultSliderTime(afterFestival))).toBe('19h00')
  })
  it('returns now at the SLIDER_START boundary (inclusive)', () => {
    expect(pickDefaultSliderTime(SLIDER_START).getTime()).toBe(SLIDER_START.getTime())
  })
  it('returns now at the SLIDER_END boundary (inclusive)', () => {
    expect(pickDefaultSliderTime(SLIDER_END).getTime()).toBe(SLIDER_END.getTime())
  })
})

describe('getNow — dev override via ?now=ISO', () => {
  const ORIGINAL_LOCATION = typeof window !== 'undefined' ? window.location : undefined

  beforeEach(() => {
    vi.stubGlobal('window', { location: { search: '' } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    if (ORIGINAL_LOCATION) {
      // keep tests hermetic
    }
  })

  it('returns new Date() when no ?now= param is present', () => {
    vi.stubGlobal('window', { location: { search: '' } })
    const before = Date.now()
    const t = getNow().getTime()
    const after = Date.now()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(after)
  })

  it('returns the overridden date when ?now= is a valid ISO', () => {
    vi.stubGlobal('window', { location: { search: '?now=2026-06-21T20:00:00%2B02:00' } })
    expect(formatSliderLabel(getNow())).toBe('20h00')
  })

  it('falls back to new Date() when ?now= is invalid', () => {
    vi.stubGlobal('window', { location: { search: '?now=not-a-date' } })
    const before = Date.now()
    const t = getNow().getTime()
    const after = Date.now()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(after)
  })

  it('returns new Date() during SSR (no window)', () => {
    vi.stubGlobal('window', undefined)
    const before = Date.now()
    const t = getNow().getTime()
    const after = Date.now()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(after)
  })
})

describe('clampToSliderRange', () => {
  it('returns default 19h00 if date is before SLIDER_START', () => {
    const earlier = new Date('2026-05-17T10:00:00+02:00')
    expect(formatSliderLabel(clampToSliderRange(earlier))).toBe('19h00')
  })
  it('returns default 19h00 if date is after SLIDER_END', () => {
    const later = new Date('2027-01-01T00:00:00+02:00')
    expect(formatSliderLabel(clampToSliderRange(later))).toBe('19h00')
  })
  it('returns the same date if within range', () => {
    const within = new Date('2026-06-21T22:00:00+02:00')
    expect(clampToSliderRange(within).getTime()).toBe(within.getTime())
  })
})
