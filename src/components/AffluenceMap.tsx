'use client'

// Carte « Affluence estimée » (onglet Affluence) — pas de pins, pas de texte : une HEATMAP
// façon carte météo, pondérée par la notoriété de l'artiste (champ `popularity`).
//
// Idée : un concert très connu (El Grande Toto = 95) attire exponentiellement plus de
// monde qu'une scène ouverte (10). Le poids par point = (popularity/100)^3 → un 95 pèse
// ~860× un 10, ET son rayon d'expansion est bien plus large. Résultat : grosse tache
// rouge tentaculaire « plein à craquer » sur les têtes d'affiche.
//
// Toute l'aire DANS le périph est teintée (fond bleu = « presque rien »), pas de noir.
// Un anneau marque le tracé du périphérique.
//
// ⚠️ Honnêteté : c'est une ESTIMATION dérivée de la notoriété, pas une mesure réelle de
// foule (cf. label « affluence estimée » + explainer dans la page).

import { useCallback, useEffect, useState } from 'react'
import MapGL, { Source, Layer, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { HeatmapLayerSpecification, FillLayerSpecification, LineLayerSpecification, CircleLayerSpecification } from 'maplibre-gl'
import type { Feature, Polygon } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { eventsToGeoJSON } from '@/lib/geojson'
import type { Event } from '@/types/event'

const HEAT_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY || 'https://tiles.openfreemap.org/styles/dark'

// Layers du fond de carte à masquer (POI + bâtiments 3D) — même liste que Map.tsx, carte épurée.
const HIDDEN_BASEMAP_LAYERS = ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit', 'building-3d']

// --- Tracé du périphérique (ellipse approximée sur la bbox réelle du périph) -----------
// Le périph n'est pas un cercle : plus large E-O (~12 km) que N-S (~9 km). On génère une
// ellipse centrée sur Paris qui en suit le contour → sert à la fois de zone à teinter
// (fond bleu) et d'anneau dessiné.
const PERIPH_CENTER: [number, number] = [2.3470, 48.8585]
const PERIPH_RX = 0.1235 // demi-largeur en ° de longitude
const PERIPH_RY = 0.0455 // demi-hauteur en ° de latitude

function buildPeriphRing(): Feature<Polygon> {
  const pts: [number, number][] = []
  const N = 128
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * 2 * Math.PI
    pts.push([
      PERIPH_CENTER[0] + PERIPH_RX * Math.cos(a),
      PERIPH_CENTER[1] + PERIPH_RY * Math.sin(a),
    ])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } }
}
const PERIPH_RING = buildPeriphRing()

// Fond bleuté de toute la zone intra-périph : « presque rien » par défaut, jamais de noir.
const periphFillLayer: FillLayerSpecification = {
  id: 'periph-fill',
  type: 'fill',
  source: 'periph',
  paint: {
    'fill-color': '#1d3a8a',
    'fill-opacity': 0.38,
  },
}

// L'anneau du périphérique.
const periphLineLayer: LineLayerSpecification = {
  id: 'periph-line',
  type: 'line',
  source: 'periph',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#9cc7ff',
    'line-width': 3,
    'line-opacity': 0.7,
    'line-blur': 0.4,
  },
}

// Heatmap pondérée par la notoriété :
//  - heatmap-weight : (popularity/100)^3 → les grosses têtes d'affiche écrasent l'amateur.
//  - heatmap-radius : data-driven sur popularity → expansion BEAUCOUP plus grande quand
//    il y a vraiment foule (un 95 rayonne ~5× plus loin qu'un 10).
//  - heatmap-color : démarre transparent (le fond bleu reste visible = « presque rien »)
//    puis chauffe cyan → vert → jaune → orange → rouge.
const heatLayer: HeatmapLayerSpecification = {
  id: 'affluence-heat',
  type: 'heatmap',
  source: 'events',
  paint: {
    'heatmap-weight': ['^', ['/', ['to-number', ['get', 'popularity']], 100], 3] as any,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 16, 3.6] as any,
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(29,58,138,0)',
      0.08, 'rgba(56,160,230,0.45)',
      0.25, '#22d3ee',
      0.42, '#4ade80',
      0.60, '#fde047',
      0.78, '#fb923c',
      1,    '#ff2d55',
    ] as any,
    'heatmap-radius': [
      'interpolate', ['linear'], ['to-number', ['get', 'popularity']],
      5, 16, 30, 34, 60, 70, 95, 110,
    ] as any,
    'heatmap-opacity': 0.9,
  },
}

// Points cliquables des concerts, au-dessus de la heatmap (comme les pins de la carte
// principale, mais sans texte). Discrets pour laisser parler les couleurs ; un clic ouvre
// la fiche. Léger grossissement avec la popularité.
const pointsLayer: CircleLayerSpecification = {
  id: 'affluence-points',
  type: 'circle',
  source: 'events',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      10, ['interpolate', ['linear'], ['to-number', ['get', 'popularity']], 5, 2.5, 95, 6],
      15, ['interpolate', ['linear'], ['to-number', ['get', 'popularity']], 5, 4.5, 95, 9],
    ] as any,
    'circle-color': '#ffffff',
    'circle-opacity': 0.92,
    'circle-stroke-width': 1.4,
    'circle-stroke-color': 'rgba(11,9,19,.85)',
  },
}

// Layers (en plus de la heatmap) qui doivent suivre le filtre tranche/genre.
const FILTERED_LAYERS = ['affluence-heat', 'affluence-points']

interface Props {
  events: Event[]
  mapFilter: unknown[]
  mapRef: React.RefObject<MapRef | null>
  onEventClick: (event: Event) => void
}

export function AffluenceMap({ events, mapFilter, mapRef, onEventClick }: Props) {
  const [ready, setReady] = useState(false)
  const [cursor, setCursor] = useState('default')
  const geojson = eventsToGeoJSON(events)

  // Applique le filtre (tranche horaire / genre) impérativement — même contrainte que
  // Map.tsx : le filtre déclaratif ne se ré-applique pas toujours sans remount.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return
    for (const id of FILTERED_LAYERS) {
      if (map.getLayer(id)) {
        try { map.setFilter(id, mapFilter as never) } catch {/* style pas prêt */}
      }
    }
  }, [mapFilter, mapRef, ready])

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map || !map.getLayer('affluence-points')) return
    const features = map.queryRenderedFeatures(e.point, { layers: ['affluence-points'] })
    if (!features.length) return
    const id = features[0].properties?.id as string
    const event = events.find(ev => ev.id === id)
    if (event) onEventClick(event)
  }, [events, onEventClick, mapRef])

  return (
    <MapGL
      ref={mapRef as React.RefObject<MapRef>}
      initialViewState={{ longitude: 2.3470, latitude: 48.8585, zoom: 11.2 }}
      minZoom={10}
      maxZoom={18}
      mapStyle={HEAT_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      cursor={cursor}
      interactiveLayerIds={['affluence-points']}
      onClick={handleClick}
      onMouseEnter={() => setCursor('pointer')}
      onMouseLeave={() => setCursor('default')}
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
      {/* Fond bleuté intra-périph (sous la heatmap) */}
      <Source id="periph" type="geojson" data={PERIPH_RING}>
        <Layer {...periphFillLayer} />
      </Source>

      {/* Heatmap d'affluence + points cliquables */}
      <Source id="events" type="geojson" data={geojson}>
        <Layer {...heatLayer} filter={mapFilter as never} />
        <Layer {...pointsLayer} filter={mapFilter as never} />
      </Source>

      {/* Anneau du périph, au-dessus de tout */}
      <Layer {...periphLineLayer} source="periph" />
    </MapGL>
  )
}
