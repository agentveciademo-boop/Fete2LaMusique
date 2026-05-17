import { describe, it, expect } from 'vitest'
import { getEventStatus, getSoonLabel, STATUS_LABELS } from './status'
import type { Event } from '@/types/event'

const baseEvent: Event = {
  id: 'e1',
  title: 'Test',
  description: '',
  venue_name: 'Venue',
  address: '',
  arrondissement: 1,
  commune: 'Paris',
  lat: 48.85, lng: 2.35,
  start_time: '2026-06-21T20:00:00+02:00',
  end_time:   '2026-06-21T22:00:00+02:00',
  genres: ['rock'],
  subgenres: [],
  is_outdoor: true,
  price_type: 'free',
  price_detail: null,
  image_url: null,
}

describe('getEventStatus', () => {
  it("returns 'ongoing' when slider is between start and end", () => {
    expect(getEventStatus(baseEvent, new Date('2026-06-21T21:00:00+02:00'))).toBe('ongoing')
  })
  it("returns 'ended' when slider is after end", () => {
    expect(getEventStatus(baseEvent, new Date('2026-06-21T23:00:00+02:00'))).toBe('ended')
  })
  it("returns 'soon' when event starts within 3 hours", () => {
    expect(getEventStatus(baseEvent, new Date('2026-06-21T18:00:00+02:00'))).toBe('soon')
  })
  it("returns 'later' when event starts in more than 3 hours", () => {
    expect(getEventStatus(baseEvent, new Date('2026-06-21T15:00:00+02:00'))).toBe('later')
  })
})

describe('getSoonLabel', () => {
  it('formats sub-hour delay in minutes', () => {
    expect(getSoonLabel(baseEvent, new Date('2026-06-21T19:30:00+02:00'))).toBe('🔜 Dans 30 min')
  })
  it('formats whole-hour delay without minutes', () => {
    expect(getSoonLabel(baseEvent, new Date('2026-06-21T18:00:00+02:00'))).toBe('🔜 Dans 2h')
  })
  it('formats hour+minutes correctly', () => {
    expect(getSoonLabel(baseEvent, new Date('2026-06-21T18:30:00+02:00'))).toBe('🔜 Dans 1h30')
  })
})

describe('STATUS_LABELS', () => {
  it('covers every EventStatus', () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(['ended', 'later', 'ongoing', 'soon'])
  })
})
