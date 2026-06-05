import { describe, it, expect } from 'vitest'
import { eventsToGeoJSON } from './geojson'
import type { Event } from '@/types/event'

const sample: Event = {
  id: 'e1',
  title: 'Concert',
  venue_name: 'Square',
  address: '1 rue X',
  arrondissement: 11,
  commune: 'Paris',
  lat: 48.86, lng: 2.37,
  start_time: '2026-06-21T20:00:00+02:00',
  end_time:   '2026-06-21T22:00:00+02:00',
  genres: ['jazz', 'rock'],
  subgenres: [],
  is_outdoor: true,
  price_type: 'free',
  price_detail: null,
  description: '',
  image_url: null,
}

describe('eventsToGeoJSON', () => {
  it('produces a valid FeatureCollection', () => {
    const geo = eventsToGeoJSON([sample])
    expect(geo.type).toBe('FeatureCollection')
    expect(geo.features).toHaveLength(1)
  })
  it('coordinates use [lng, lat] order (GeoJSON spec)', () => {
    const geo = eventsToGeoJSON([sample])
    expect(geo.features[0].geometry.coordinates).toEqual([2.37, 48.86])
  })
  it('session_day and slot drive the MapLibre filter (day + time bucket)', () => {
    const geo = eventsToGeoJSON([sample])
    const p = geo.features[0].properties as any
    // Dim 21 20h → jour de session 2026-06-21, tranche soirée (18h–20h)
    expect(p.session_day).toBe('2026-06-21')
    expect(p.slot).toBe('soiree')
  })
  it('genre_primary is the first genre', () => {
    const geo = eventsToGeoJSON([sample])
    expect((geo.features[0].properties as any).genre_primary).toBe('jazz')
  })
  it('pie_key joins genres with "+" (capped at 4 slices for legibility)', () => {
    const geo = eventsToGeoJSON([sample])
    expect((geo.features[0].properties as any).pie_key).toBe('jazz+rock')
    const many = eventsToGeoJSON([{ ...sample, genres: ['jazz', 'rock', 'pop', 'folk', 'blues'] }])
    expect((many.features[0].properties as any).pie_key).toBe('jazz+rock+pop+folk')
  })
  it('subgenres array is passed through to feature properties', () => {
    const withSubs: Event = { ...sample, subgenres: ['salsa', 'bachata'] }
    const geo = eventsToGeoJSON([withSubs])
    expect((geo.features[0].properties as any).subgenres).toEqual(['salsa', 'bachata'])
  })
  it('is_outdoor: true → 1, false → 0, null → -1 (numeric for MapLibre filter)', () => {
    const outdoor = eventsToGeoJSON([{ ...sample, is_outdoor: true }])
    const indoor  = eventsToGeoJSON([{ ...sample, is_outdoor: false }])
    const unknown = eventsToGeoJSON([{ ...sample, is_outdoor: null }])
    expect((outdoor.features[0].properties as any).is_outdoor).toBe(1)
    expect((indoor.features[0].properties  as any).is_outdoor).toBe(0)
    expect((unknown.features[0].properties as any).is_outdoor).toBe(-1)
  })
})
