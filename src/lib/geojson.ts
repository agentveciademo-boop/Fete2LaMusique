import type { FeatureCollection, Feature, Point } from 'geojson'
import type { Event } from '@/types/event'
import { getSessionDate, toSessionAxis } from './session'

export function eventsToGeoJSON(events: Event[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: events.map(eventToFeature),
  }
}

function eventToFeature(event: Event): Feature<Point> {
  const session_date = event.session_date ?? getSessionDate(event.start_time)
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [event.lng, event.lat] },
    properties: {
      id:            event.id,
      title:         event.title,
      genre_primary: event.genres[0],
      genres:        event.genres,
      subgenres:     event.subgenres,
      session_date,
      start_axis:    toSessionAxis(event.start_time, session_date),
      end_axis:      toSessionAxis(event.end_time,   session_date),
      is_outdoor:    event.is_outdoor === null ? -1 : event.is_outdoor ? 1 : 0,
      price_type:    event.price_type,
    },
  }
}
