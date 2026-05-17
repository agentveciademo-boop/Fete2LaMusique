import type { FeatureCollection, Feature, Point } from 'geojson'
import type { Event } from '@/types/event'

export function eventsToGeoJSON(events: Event[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: events.map(eventToFeature),
  }
}

function eventToFeature(event: Event): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [event.lng, event.lat] },
    properties: {
      id:            event.id,
      title:         event.title,
      genre_primary: event.genres[0],
      genres:        event.genres,
      start_ts:      new Date(event.start_time).getTime(),
      end_ts:        new Date(event.end_time).getTime(),
      is_outdoor:    event.is_outdoor === null ? -1 : event.is_outdoor ? 1 : 0,
      price_type:    event.price_type,
    },
  }
}
