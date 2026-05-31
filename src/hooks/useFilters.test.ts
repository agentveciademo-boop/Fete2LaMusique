/**
 * Tests of the core filter logic from useFilters (axe continu week-end + timeRange).
 * Written as pure function tests to avoid needing @testing-library/react /jsdom.
 * The predicate logic mirrors useFilters.ts filteredEvents computation exactly.
 */
import { describe, it, expect } from 'vitest'
import type { Event } from '@/types/event'
import { toWeekendAxis } from '@/lib/session'
import type { Filters } from './useFilters'

// Minimal Event factory
function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'start_time' | 'end_time'>): Event {
  return {
    title: 'Test concert',
    venue_name: 'Venue',
    address: '1 rue Test, 75011 Paris',
    arrondissement: 11,
    commune: 'Paris',
    lat: 48.86, lng: 2.37,
    genres: [],
    subgenres: [],
    is_outdoor: null,
    price_type: 'free',
    price_detail: null,
    description: '',
    image_url: null,
    ...overrides,
  }
}

// Annotate an event with absolute weekend axis (mirrors useFilters annotated memo)
function annotate(e: Event) {
  return {
    event: e,
    start_axis: toWeekendAxis(e.start_time),
    end_axis:   toWeekendAxis(e.end_time),
  }
}

// Core filter predicate — exact copy of filteredEvents overlap logic in useFilters.ts
function matches(e: Event, filters: Pick<Filters, 'timeRange'>): boolean {
  const { start_axis, end_axis } = annotate(e)
  const [lo, hi] = filters.timeRange
  return !(end_axis < lo || start_axis > hi)
}

// ─── Fixtures (axe continu : Sam 00h = 0, Dim 00h = 24) ──────────────────────

// Samedi 23h30 → start 23.5, fin (dim 01h) → 25
const EVT_SAT_2330 = makeEvent({
  id: 'sat-2330',
  start_time: '2026-06-20T23:30:00+02:00',
  end_time:   '2026-06-21T01:00:00+02:00',
})

// Dimanche 02h15 (nuit du samedi) → start 26.25, fin → 27.5
const EVT_SUN_0215 = makeEvent({
  id: 'sun-0215',
  start_time: '2026-06-21T02:15:00+02:00',
  end_time:   '2026-06-21T03:30:00+02:00',
})

// Dimanche 14h → start 38, fin (16h) → 40
const EVT_SUN_14 = makeEvent({
  id: 'sun-14',
  start_time: '2026-06-21T14:00:00+02:00',
  end_time:   '2026-06-21T16:00:00+02:00',
})

// ─── timeRange overlap ────────────────────────────────────────────────────────

describe('timeRange axis overlap', () => {
  it('event sam 23h30→01h (23.5→25) overlaps [22, 26]', () => {
    expect(matches(EVT_SAT_2330, { timeRange: [22, 26] })).toBe(true)
  })

  it('event sam 23h30→01h ne chevauche PAS [14, 23] (start 23.5 > hi 23)', () => {
    expect(matches(EVT_SAT_2330, { timeRange: [14, 23] })).toBe(false)
  })

  it('event dim 14h→16h (38→40) overlaps [36, 40]', () => {
    expect(matches(EVT_SUN_14, { timeRange: [36, 40] })).toBe(true)
  })

  it('event dim 14h→16h ne chevauche PAS [24, 36] (start 38 > hi 36)', () => {
    expect(matches(EVT_SUN_14, { timeRange: [24, 36] })).toBe(false)
  })

  it('event nuit du samedi 02h15 (26.25→27.5) overlaps [24, 28]', () => {
    expect(matches(EVT_SUN_0215, { timeRange: [24, 28] })).toBe(true)
  })

  it('plage complète [0, 48] matche tous les events du week-end', () => {
    expect(matches(EVT_SAT_2330, { timeRange: [0, 48] })).toBe(true)
    expect(matches(EVT_SUN_0215, { timeRange: [0, 48] })).toBe(true)
    expect(matches(EVT_SUN_14,   { timeRange: [0, 48] })).toBe(true)
  })
})

// ─── axis values sanity ───────────────────────────────────────────────────────

describe('toWeekendAxis values', () => {
  it('sam 23h30 → axis 23.5', () => {
    expect(annotate(EVT_SAT_2330).start_axis).toBeCloseTo(23.5, 1)
  })
  it('dim 01h00 → axis 25', () => {
    expect(annotate(EVT_SAT_2330).end_axis).toBeCloseTo(25, 1)
  })
  it('dim 14h → axis 38', () => {
    expect(annotate(EVT_SUN_14).start_axis).toBeCloseTo(38, 1)
  })
  it('dim 02h15 → axis 26.25', () => {
    expect(annotate(EVT_SUN_0215).start_axis).toBeCloseTo(26.25, 1)
  })
})
