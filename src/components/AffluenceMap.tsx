'use client'

// Carte « Affluence estimée » (onglet Affluence) — remplace les pins par une HEATMAP
// façon carte météo, pondérée par la notoriété de l'artiste (champ `popularity`).
//
// Idée : un concert très connu (El Grande Toto = 95) attire exponentiellement plus de
// monde qu'une scène ouverte (10). Le poids par point = (popularity/100)^3 → un 95 pèse
// ~860× un 10. Résultat : grosse tache rouge « plein à craquer » sur les têtes d'affiche,
// quasi rien là où il n'y a que de l'amateur, vide là où il n'y a personne.
//
// ⚠️ Honnêteté : c'est une ESTIMATION dérivée de la notoriété, pas une mesure réelle de
// foule (cf. label « affluence estimée » + explainer dans la page).

import { useRef, useEffect, useState } from 'react'
import MapGL, { Source, Layer, type MapRef } from 'react-map-gl/maplibre'
import type { HeatmapLayerSpecification, SymbolLayerSpecification, CircleLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { eventsToGeoJSON } from '@/lib/geojson'
import type { Event } from '@/types/event'

const HEAT_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY || 'https://tiles.openfreemap.org/styles/dark'

// Layers du fond de carte à masquer (POI + bâtiments 3D) — même liste que Map.tsx, carte épurée.
const HIDDEN_BASEMAP_LAYERS = ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit', 'building-3d']

// Seuil au-dessus duquel on nomme le foyer (sinon la carte n'est que des taches anonymes).
const LABEL_MIN_POP = 45

// Heatmap pondérée par la notoriété. heatmap-weight accepte une expression sur les
// propriétés du point (pas le zoom) → poids exponentiel (^3) sur popularity normalisée.
const heatLayer: HeatmapLayerSpecification = {
  id: 'affluence-heat',
  type: 'heatmap',
  source: 'events',
  paint: {
    'heatmap-weight': ['^', ['/', ['to-number', ['get', 'popularity']], 100], 3] as any,
    // L'intensité globale monte avec le zoom (les taches se concentrent en zoomant).
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 3.2] as any,
    // Dégradé « carte météo » : transparent → bleu → cyan → vert → jaune → orange → rouge.
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(11,9,19,0)',
      0.12, '#1d2f8f',
      0.28, '#1e90ff',
      0.42, '#00e5cc',
      0.58, '#4ade80',
      0.72, '#fde047',
      0.86, '#fb923c',
      1,    '#ff2d55',
    ] as any,
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 16, 13, 34, 16, 62] as any,
    'heatmap-opacity': 0.85,
  },
}

// Foyers majeurs : petit point lumineux + nom du concert, au-dessus de la heatmap.
const hotspotDotLayer: CircleLayerSpecification = {
  id: 'affluence-hotspot-dot',
  type: 'circle',
  source: 'events',
  filter: ['>=', ['to-number', ['get', 'popularity']], LABEL_MIN_POP],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['to-number', ['get', 'popularity']], 45, 3, 95, 6],
    'circle-color': '#fff',
    'circle-opacity': 0.9,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ff2d55',
  },
}

const hotspotLabelLayer: SymbolLayerSpecification = {
  id: 'affluence-hotspot-label',
  type: 'symbol',
  source: 'events',
  filter: ['>=', ['to-number', ['get', 'popularity']], LABEL_MIN_POP],
  minzoom: 12,
  layout: {
    'text-field': ['get', 'title'],
    'text-size': 11,
    'text-offset': [0, 1.1],
    'text-anchor': 'top',
    'text-max-width': 9,
    'text-allow-overlap': false,
  },
  paint: {
    'text-color': '#fff',
    'text-halo-color': '#0B0913',
    'text-halo-width': 1.4,
  },
}

interface Props {
  events: Event[]
  mapFilter: unknown[]
  mapRef: React.RefObject<MapRef | null>
}

export function AffluenceMap({ events, mapFilter, mapRef }: Props) {
  const [ready, setReady] = useState(false)
  const geojson = eventsToGeoJSON(events)

  // Applique le filtre (tranche horaire / genre) impérativement sur les 3 calques — même
  // contrainte que Map.tsx : le filtre déclaratif ne se ré-applique pas toujours sans remount.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return
    for (const id of ['affluence-heat', 'affluence-hotspot-dot', 'affluence-hotspot-label']) {
      if (map.getLayer(id)) {
        try { map.setFilter(id, mapFilter as never) } catch {/* style pas prêt */}
      }
    }
  }, [mapFilter, mapRef, ready])

  return (
    <MapGL
      ref={mapRef as React.RefObject<MapRef>}
      initialViewState={{ longitude: 2.3488, latitude: 48.8534, zoom: 11.5 }}
      minZoom={10}
      maxZoom={18}
      mapStyle={HEAT_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      onLoad={() => setReady(true)}
      onStyleData={() => {
        const map = mapRef.current?.getMap()
        if (!map) return
        for (const id of HIDDEN_BASEMAP_LAYERS) {
          if (map.getLayer(id)) {
            try { map.setLayoutProperty(id, 'visibility', 'none') } catch {/* style pas prêt */}
          }
        }
      }}
    >
      <Source id="events" type="geojson" data={geojson}>
        <Layer {...heatLayer} filter={mapFilter as never} />
        <Layer {...hotspotDotLayer} filter={mapFilter as never} />
        <Layer {...hotspotLabelLayer} filter={mapFilter as never} />
      </Source>
    </MapGL>
  )
}
