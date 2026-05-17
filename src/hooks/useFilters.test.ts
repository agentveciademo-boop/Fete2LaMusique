/**
 * Tests of the core filter logic from useFilters (session_date + timeRange).
 * Written as pure function tests to avoid needing @testing-library/react /jsdom.
 * The predicate logic mirrors useFilters.ts filteredEvents computation exactly.
 */
import { describe, it, expect } from 'vitest'
import type { Event } from '@/types/event'
import { getSessionDate, toSessionAxis } from '@/lib/session'
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

// Annotate an event with session_date + axis (mirrors useFilters annotated memo)
function annotate(e: Event) {
  const session_date = e.session_date ?? getSessionDate(e.start_time)
  return {
    event: e,
    session_date,
    start_axis: toSessionAxis(e.start_time, session_date),
    end_axis:   toSessionAxis(e.end_time,   session_date),
  }
}

// Core filter predicate — exact copy of filteredEvents logic in useFilters.ts
function matches(e: Event, filters: Pick<Filters, 'sessionDate' | 'timeRange'>): boolean {
  const { session_date, start_axis, end_axis } = annotate(e)
  const [lo, hi] = filters.timeRange
  if (filters.sessionDate !== null && session_date !== filters.sessionDate) return false
  if (end_axis < lo || start_axis > hi) return false
  return true
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

// Saturday 2026-06-20, 23h30 Paris (CEST = UTC+2) → session_date = '2026-06-20'
const EVT_SAT_2330 = makeEvent({
  id: 'sat-2330',
  start_time: '2026-06-20T23:30:00+02:00',
  end_time:   '2026-06-21T01:00:00+02:00',
})

// Sunday 2026-06-21, 02h15 Paris → session_date = '2026-06-21'? No: 02h < 06h → session = '2026-06-20'
// (This validates the "après minuit" case: belongs to the saturday session)
const EVT_SUN_0215 = makeEvent({
  id: 'sun-0215',
  start_time: '2026-06-21T02:15:00+02:00',
  end_time:   '2026-06-21T03:30:00+02:00',
})

// Sunday 2026-06-21, 14h Paris → session_date = '2026-06-21'
const EVT_SUN_14 = makeEvent({
  id: 'sun-14',
  start_time: '2026-06-21T14:00:00+02:00',
  end_time:   '2026-06-21T16:00:00+02:00',
})

// Sunday 2026-06-21, 15h Paris → session_date = '2026-06-21'
const EVT_SUN_15 = makeEvent({
  id: 'sun-15',
  start_time: '2026-06-21T15:00:00+02:00',
  end_time:   '2026-06-21T17:00:00+02:00',
})

// ─── session_date derivation ─────────────────────────────────────────────────

describe('session_date derivation', () => {
  it('23h30 sam → session 2026-06-20 (soirée du samedi)', () => {
    expect(annotate(EVT_SAT_2330).session_date).toBe('2026-06-20')
  })

  it('02h15 dim → session 2026-06-20 (encore la soirée du samedi)', () => {
    expect(annotate(EVT_SUN_0215).session_date).toBe('2026-06-20')
  })

  it('14h dim → session 2026-06-21', () => {
    expect(annotate(EVT_SUN_14).session_date).toBe('2026-06-21')
  })
})

// ─── sessionDate filter ───────────────────────────────────────────────────────

describe('sessionDate filter', () => {
  it('event 23h30 sam matched by sessionDate=2026-06-20 AND timeRange=[22, 25]', () => {
    expect(matches(EVT_SAT_2330, { sessionDate: '2026-06-20', timeRange: [22, 25] })).toBe(true)
  })

  it('event 23h30 sam NOT matched by sessionDate=2026-06-21 (wrong soirée)', () => {
    expect(matches(EVT_SAT_2330, { sessionDate: '2026-06-21', timeRange: [14, 30] })).toBe(false)
  })

  it('event 14h dim matched by sessionDate=2026-06-21 AND timeRange=[14, 18]', () => {
    expect(matches(EVT_SUN_14, { sessionDate: '2026-06-21', timeRange: [14, 18] })).toBe(true)
  })

  it('sessionDate=null (Tout) matches both soirées', () => {
    expect(matches(EVT_SAT_2330, { sessionDate: null, timeRange: [14, 30] })).toBe(true)
    expect(matches(EVT_SUN_14,   { sessionDate: null, timeRange: [14, 30] })).toBe(true)
  })
})

// ─── timeRange overlap ────────────────────────────────────────────────────────

describe('timeRange axis overlap', () => {
  it('event 23h30→01h00 (axis ~23.5→25) overlaps [22, 25]', () => {
    expect(matches(EVT_SAT_2330, { sessionDate: '2026-06-20', timeRange: [22, 25] })).toBe(true)
  })

  it('event 23h30→01h00 does NOT overlap [14, 23] (start_axis 23.5 > hi 23)', () => {
    expect(matches(EVT_SAT_2330, { sessionDate: '2026-06-20', timeRange: [14, 23] })).toBe(false)
  })

  it('event 14h→16h (axis 14→16) overlaps [14, 18]', () => {
    expect(matches(EVT_SUN_14, { sessionDate: '2026-06-21', timeRange: [14, 18] })).toBe(true)
  })

  it('event 14h→16h does NOT overlap [18, 23] (end_axis 16 < lo 18)', () => {
    expect(matches(EVT_SUN_14, { sessionDate: '2026-06-21', timeRange: [18, 23] })).toBe(false)
  })

  it('event 02h15 (axis ~26.25) overlaps [25, 28] on sam session', () => {
    expect(matches(EVT_SUN_0215, { sessionDate: '2026-06-20', timeRange: [25, 28] })).toBe(true)
  })
})

// ─── axis values sanity ───────────────────────────────────────────────────────

describe('toSessionAxis values', () => {
  it('23h30 on sam session → axis 23.5', () => {
    const { start_axis } = annotate(EVT_SAT_2330)
    expect(start_axis).toBeCloseTo(23.5, 1)
  })

  it('01h00 (next day) on sam session → axis 25', () => {
    const { end_axis } = annotate(EVT_SAT_2330)
    expect(end_axis).toBeCloseTo(25, 1)
  })

  it('14h on dim session → axis 14', () => {
    const { start_axis } = annotate(EVT_SUN_14)
    expect(start_axis).toBeCloseTo(14, 1)
  })

  it('15h on dim session → axis 15', () => {
    const { start_axis } = annotate(EVT_SUN_15)
    expect(start_axis).toBeCloseTo(15, 1)
  })
})
