import type { FeatureCollection, Feature, Point } from 'geojson'
import type { Event } from '@/types/event'
import { toWeekendAxis } from './session'

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
      subgenres:     event.subgenres,
      arrondissement: event.arrondissement ?? 0, // 0 = hors Paris ("Autre")
      start_axis:    toWeekendAxis(event.start_time),
      end_axis:      toWeekendAxis(event.end_time),
      is_outdoor:    event.is_outdoor === null ? -1 : event.is_outdoor ? 1 : 0,
      price_type:    event.price_type,
    },
  }
}
