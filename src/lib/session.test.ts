import { describe, it, expect } from 'vitest'
import { getSessionDate, toWeekendAxis, weekendAxisToDate, formatAxisHour } from './session'

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
})

describe('toWeekendAxis — axe continu 0–48 (origine Sam 00h)', () => {
  it('Sam 00h → 0', () => {
    expect(toWeekendAxis('2026-06-20T00:00:00+02:00')).toBeCloseTo(0)
  })
  it('Sam 14h → 14', () => {
    expect(toWeekendAxis('2026-06-20T14:00:00+02:00')).toBeCloseTo(14)
  })
  it('Dim 00h → 24', () => {
    expect(toWeekendAxis('2026-06-21T00:00:00+02:00')).toBeCloseTo(24)
  })
  it('Dim 15h → 39', () => {
    expect(toWeekendAxis('2026-06-21T15:00:00+02:00')).toBeCloseTo(39)
  })
  it('Dim 20h30 → 44.5', () => {
    expect(toWeekendAxis('2026-06-21T20:30:00+02:00')).toBeCloseTo(44.5)
  })
  it('clamps lundi 02h to TIME_AXIS_MAX (48)', () => {
    expect(toWeekendAxis('2026-06-22T02:00:00+02:00')).toBe(48)
  })
  it('clamps a value before the window to 0', () => {
    expect(toWeekendAxis('2026-06-19T20:00:00+02:00')).toBe(0)
  })
})

describe('weekendAxisToDate — inverse anchoring', () => {
  it('axis 14 → 2026-06-20 14h Paris', () => {
    expect(weekendAxisToDate(14).toISOString()).toBe('2026-06-20T12:00:00.000Z')
  })
  it('axis 39 → 2026-06-21 15h Paris', () => {
    expect(weekendAxisToDate(39).toISOString()).toBe('2026-06-21T13:00:00.000Z')
  })
  it('axis 24 → 2026-06-21 00h Paris', () => {
    expect(weekendAxisToDate(24).toISOString()).toBe('2026-06-20T22:00:00.000Z')
  })
})

describe('formatAxisHour — day-aware', () => {
  it('formats 0 → "Sam 00h"', () => expect(formatAxisHour(0)).toBe('Sam 00h'))
  it('formats 14 → "Sam 14h"', () => expect(formatAxisHour(14)).toBe('Sam 14h'))
  it('formats 24 → "Dim 00h"', () => expect(formatAxisHour(24)).toBe('Dim 00h'))
  it('formats 39 → "Dim 15h"', () => expect(formatAxisHour(39)).toBe('Dim 15h'))
  it('formats 48 → "Dim 24h" (fin de dimanche)', () => expect(formatAxisHour(48)).toBe('Dim 24h'))
})
