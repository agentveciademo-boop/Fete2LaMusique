import type { FeatureCollection, Feature, Point } from 'geojson'
import type { Event } from '@/types/event'
import { eventSlot, eventSessionDate } from './slots'

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
      // Clé d'icône camembert : genres plafonnés à 4 parts (lisibilité d'un pin ~22px),
      // joints par '+'. Map.tsx dessine une image par combinaison via `styleimagemissing`.
      pie_key:       event.genres.slice(0, 4).join('+'),
      subgenres:     event.subgenres,
      arrondissement: event.arrondissement ?? 0, // 0 = hors Paris ("Autre")
      // Filtres carte (cf. useFilters.mapFilter) : jour de session + tranche horaire.
      session_day:   eventSessionDate(event),
      slot:          eventSlot(event),
      is_outdoor:    event.is_outdoor === null ? -1 : event.is_outdoor ? 1 : 0,
      price_type:    event.price_type,
    },
  }
}
