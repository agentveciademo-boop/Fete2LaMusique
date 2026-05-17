import { describe, it, expect } from 'vitest'
import { getSessionDate, toSessionAxis, axisToDate, formatAxisHour } from './session'

describe('getSessionDate — soirée semantics', () => {
  // Sat 23h30 → still belongs to Saturday's evening.
  it('returns same day for late evening (23h30 Paris)', () => {
    expect(getSessionDate('2026-06-21T23:30:00+02:00')).toBe('2026-06-21')
  })
  // Sun 02h15 (after midnight) → still Saturday's evening.
  it('returns previous day for early morning (02h15 Paris)', () => {
    expect(getSessionDate('2026-06-22T02:15:00+02:00')).toBe('2026-06-21')
  })
  // Sun 08h → starts a new day.
  it('returns same day for morning (08h Paris)', () => {
    expect(getSessionDate('2026-06-22T08:00:00+02:00')).toBe('2026-06-22')
  })
  // Sun 15h → same day.
  it('returns same day for afternoon (15h Paris)', () => {
    expect(getSessionDate('2026-06-21T15:00:00+02:00')).toBe('2026-06-21')
  })
  // 06h boundary — rule says [06h, 14h] = ce jour.
  it('treats 06h00 as same-day session', () => {
    expect(getSessionDate('2026-06-22T06:00:00+02:00')).toBe('2026-06-22')
  })
  // 05h59 just before the rollover → previous day.
  it('treats 05h59 as previous-day session', () => {
    expect(getSessionDate('2026-06-22T05:59:00+02:00')).toBe('2026-06-21')
  })
})

describe('toSessionAxis — axis 14–30', () => {
  it('places 15h on session day at 15', () => {
    expect(toSessionAxis('2026-06-21T15:00:00+02:00', '2026-06-21')).toBeCloseTo(15)
  })
  it('places 23h on session day at 23', () => {
    expect(toSessionAxis('2026-06-21T23:00:00+02:00', '2026-06-21')).toBeCloseTo(23)
  })
  it('places 02h next day at 26 (anchored on previous evening)', () => {
    expect(toSessionAxis('2026-06-22T02:00:00+02:00', '2026-06-21')).toBeCloseTo(26)
  })
  it('clamps an out-of-window value to TIME_AXIS_MAX', () => {
    expect(toSessionAxis('2026-06-22T10:00:00+02:00', '2026-06-21')).toBe(30)
  })
})

describe('axisToDate — inverse anchoring', () => {
  it('axis 19 on 2026-06-21 → 2026-06-21 19h Paris', () => {
    const d = axisToDate('2026-06-21', 19)
    expect(d.toISOString()).toBe('2026-06-21T17:00:00.000Z')
  })
  it('axis 26 on 2026-06-21 → 2026-06-22 02h Paris', () => {
    const d = axisToDate('2026-06-21', 26)
    expect(d.toISOString()).toBe('2026-06-22T00:00:00.000Z')
  })
})

describe('formatAxisHour', () => {
  it('formats 14 → "14h"', () => expect(formatAxisHour(14)).toBe('14h'))
  it('formats 23 → "23h"', () => expect(formatAxisHour(23)).toBe('23h'))
  it('formats 24 → "00h" (rollover)', () => expect(formatAxisHour(24)).toBe('00h'))
  it('formats 26 → "02h"', () => expect(formatAxisHour(26)).toBe('02h'))
  it('formats 30 → "06h"', () => expect(formatAxisHour(30)).toBe('06h'))
})
