/**
 * Tests de la logique de filtrage de useFilters (tranches horaires + jour visible).
 * Écrits en tests de fonctions pures pour éviter @testing-library/react / jsdom.
 * Les prédicats reflètent exactement filteredEvents / slotCounts de useFilters.ts.
 */
import { describe, it, expect } from 'vitest'
import type { Event, Genre } from '@/types/event'
import { hourToSlot, eventSlot, eventSessionDate, type SlotId } from '@/lib/slots'
import { VISIBLE_SESSION_DATE, type Filters } from './useFilters'

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

// Prédicat de filtrage — copie exacte de filteredEvents dans useFilters.ts
function matches(e: Event, filters: Filters): boolean {
  if (eventSessionDate(e) !== VISIBLE_SESSION_DATE) return false
  if (filters.slot && eventSlot(e) !== filters.slot) return false
  if (filters.genres.length > 0 && !filters.genres.some(g => e.genres.includes(g))) return false
  if (filters.arrondissements.length > 0 && !filters.arrondissements.includes(e.arrondissement ?? 0)) return false
  return true
}

const NO_FILTER: Filters = { slot: null, genres: [], arrondissements: [] }

// ─── hourToSlot : partition complète des 24h ────────────────────────────────

describe('hourToSlot — bornes des tranches', () => {
  const cases: Array<[number, SlotId]> = [
    [0, 'nuit'], [3, 'nuit'], [5, 'nuit'],
    [6, 'matin'], [8, 'matin'], [12, 'matin'],
    [13, 'debut-aprem'], [15, 'debut-aprem'],
    [16, 'fin-aprem'], [17, 'fin-aprem'],
    [18, 'soiree'], [20, 'soiree'],
    [21, 'nuit'], [23, 'nuit'],
  ]
  it.each(cases)('%ih → %s', (hour, slot) => {
    expect(hourToSlot(hour)).toBe(slot)
  })

  it('couvre les 24 heures (aucune heure sans tranche)', () => {
    for (let h = 0; h < 24; h++) {
      expect(['matin', 'debut-aprem', 'fin-aprem', 'soiree', 'nuit']).toContain(hourToSlot(h))
    }
  })
})

// ─── eventSlot : depuis l'heure de début (Europe/Paris) ─────────────────────

describe("eventSlot — d'après start_time", () => {
  it('concert à 18h → soirée', () => {
    expect(eventSlot(makeEvent({ id: 'a', start_time: '2026-06-21T18:00:00+02:00', end_time: '2026-06-21T20:00:00+02:00' }))).toBe('soiree')
  })
  it('after-party à 00h30 → nuit', () => {
    expect(eventSlot(makeEvent({ id: 'b', start_time: '2026-06-21T00:30:00+02:00', end_time: '2026-06-21T03:00:00+02:00' }))).toBe('nuit')
  })
  it('concert à 14h → début aprem', () => {
    expect(eventSlot(makeEvent({ id: 'c', start_time: '2026-06-21T14:00:00+02:00', end_time: '2026-06-21T15:00:00+02:00' }))).toBe('debut-aprem')
  })
})

// ─── eventSessionDate : champ ETL prioritaire, fallback date Paris ───────────

describe('eventSessionDate', () => {
  it("utilise le champ session_date fourni par l'ETL", () => {
    const e = makeEvent({ id: 'd', start_time: '2026-06-21T00:00:00+02:00', end_time: '2026-06-21T01:00:00+02:00', session_date: '2026-06-21' })
    expect(eventSessionDate(e)).toBe('2026-06-21')
  })
  it('fallback sur la date calendaire Paris quand session_date absent', () => {
    const e = makeEvent({ id: 'e', start_time: '2026-06-20T15:00:00+02:00', end_time: '2026-06-20T16:00:00+02:00' })
    expect(eventSessionDate(e)).toBe('2026-06-20')
  })
})

// ─── Jour visible : le samedi 20 est masqué ─────────────────────────────────

describe('filtre du jour visible (dimanche 21)', () => {
  const samedi = makeEvent({ id: 'sat', start_time: '2026-06-20T18:00:00+02:00', end_time: '2026-06-20T20:00:00+02:00', session_date: '2026-06-20' })
  const dimanche = makeEvent({ id: 'sun', start_time: '2026-06-21T18:00:00+02:00', end_time: '2026-06-21T20:00:00+02:00', session_date: '2026-06-21' })

  it('un concert du samedi est masqué même sans filtre', () => {
    expect(matches(samedi, NO_FILTER)).toBe(false)
  })
  it('un concert du dimanche passe', () => {
    expect(matches(dimanche, NO_FILTER)).toBe(true)
  })
})

// ─── Combinaison tranche + genre + arrondissement ───────────────────────────

describe('filtrage combiné', () => {
  const jazz18e = makeEvent({
    id: 'j', start_time: '2026-06-21T19:00:00+02:00', end_time: '2026-06-21T21:00:00+02:00',
    session_date: '2026-06-21', genres: ['jazz'] as Genre[], arrondissement: 18,
  })

  it('soirée + jazz + 18e → match', () => {
    expect(matches(jazz18e, { slot: 'soiree', genres: ['jazz'], arrondissements: [18] })).toBe(true)
  })
  it('tranche matin exclut un concert de soirée', () => {
    expect(matches(jazz18e, { slot: 'matin', genres: [], arrondissements: [] })).toBe(false)
  })
  it('genre rock exclut un concert jazz', () => {
    expect(matches(jazz18e, { slot: null, genres: ['rock'], arrondissements: [] })).toBe(false)
  })
  it('arrondissement 11 exclut un concert du 18e', () => {
    expect(matches(jazz18e, { slot: null, genres: [], arrondissements: [11] })).toBe(false)
  })
})

// ─── slotCounts : volume par tranche (ignore la tranche sélectionnée) ────────

describe('slotCounts', () => {
  const events = [
    makeEvent({ id: '1', start_time: '2026-06-21T10:00:00+02:00', end_time: '2026-06-21T11:00:00+02:00', session_date: '2026-06-21' }), // matin
    makeEvent({ id: '2', start_time: '2026-06-21T14:00:00+02:00', end_time: '2026-06-21T15:00:00+02:00', session_date: '2026-06-21' }), // debut-aprem
    makeEvent({ id: '3', start_time: '2026-06-21T19:00:00+02:00', end_time: '2026-06-21T21:00:00+02:00', session_date: '2026-06-21' }), // soiree
    makeEvent({ id: '4', start_time: '2026-06-21T19:30:00+02:00', end_time: '2026-06-21T21:00:00+02:00', session_date: '2026-06-21' }), // soiree
    makeEvent({ id: 'sat', start_time: '2026-06-20T19:00:00+02:00', end_time: '2026-06-20T21:00:00+02:00', session_date: '2026-06-20' }), // masqué
  ]

  function countSlots(evs: Event[]): Record<SlotId, number> {
    const counts = { matin: 0, 'debut-aprem': 0, 'fin-aprem': 0, soiree: 0, nuit: 0 } as Record<SlotId, number>
    for (const e of evs) {
      if (eventSessionDate(e) !== VISIBLE_SESSION_DATE) continue
      counts[eventSlot(e)]++
    }
    return counts
  }

  it('compte par tranche en excluant le samedi', () => {
    const c = countSlots(events)
    expect(c.matin).toBe(1)
    expect(c['debut-aprem']).toBe(1)
    expect(c.soiree).toBe(2)
    expect(c['fin-aprem']).toBe(0)
    expect(c.nuit).toBe(0)
  })
})
