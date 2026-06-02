'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, SymbolLayerSpecification, LineLayerSpecification, FillLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { eventsToGeoJSON } from '@/lib/geojson'
import type { Event } from '@/types/event'

const PRIMARY_STYLE  = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY  || 'https://tiles.openfreemap.org/styles/liberty'
const FALLBACK_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_FALLBACK || 'https://tiles.openfreemap.org/styles/liberty'

// Couleur unique des concerts. La couleur n'encode pas le genre (souvent multiple) :
// le filtrage par genre se fait via les pastilles. Évite une couleur trompeuse.
const CONCERT_COLOR = '#FF6B6B'

const clustersLayer: CircleLayerSpecification = {
  id: 'events-clusters',
  type: 'circle',
  source: 'events',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': 'rgba(255,255,255,0.85)',
    'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 32],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FF6B6B',
  },
}

const clusterCountLayer: SymbolLayerSpecification = {
  id: 'events-cluster-count',
  type: 'symbol',
  source: 'events',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 13,
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
  },
  paint: { 'text-color': '#111' },
}

const unclusteredLayer: CircleLayerSpecification = {
  id: 'events-unclustered',
  type: 'circle',
  source: 'events',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': 9,
    'circle-color': CONCERT_COLOR,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
    'circle-opacity': 0.95,
  },
}

// Transit (métro/RER) — casing blanc + ligne couleur officielle. Sous les concerts.
const transitCasingLayer: LineLayerSpecification = {
  id: 'transit-casing',
  type: 'line',
  source: 'transit',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#ffffff',
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 7],
    'line-opacity': 0.25,
  },
}

const transitLineLayer: LineLayerSpecification = {
  id: 'transit-line',
  type: 'line',
  source: 'transit',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': ['get', 'color'] as any,
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 4.5],
    'line-opacity': 0.43,
  },
}

// Stations métro/RER — petits points, cliquables pour afficher le nom.
const stationLayer: CircleLayerSpecification = {
  id: 'transit-stations',
  type: 'circle',
  source: 'stations',
  minzoom: 11,
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 5],
    'circle-color': '#ffffff',
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#333333',
  },
}

// Contour des arrondissements sélectionnés — léger fill + bordure nette. Sous les concerts.
const arrFillLayer: FillLayerSpecification = {
  id: 'arr-fill',
  type: 'fill',
  source: 'arrondissements',
  paint: { 'fill-color': '#FF6B6B', 'fill-opacity': 0.08 },
}

const arrOutlineLayer: LineLayerSpecification = {
  id: 'arr-outline',
  type: 'line',
  source: 'arrondissements',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': '#FF6B6B', 'line-width': 2.5, 'line-opacity': 0.9 },
}

const pulseLayer: CircleLayerSpecification = {
  id: 'events-pulse',
  type: 'circle',
  source: 'events',
  filter: ['==', 'id', ''],
  paint: {
    'circle-radius': 9,
    'circle-color': CONCERT_COLOR,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
    'circle-opacity': 0.95,
  },
}

interface Props {
  events: Event[]
  mapFilter: any[]
  sliderTime: Date
  onEventClick: (event: Event) => void
  mapRef: React.RefObject<MapRef | null>
  selectedArr: number[]
}

export function MapView({ events, mapFilter, sliderTime, onEventClick, mapRef, selectedArr }: Props) {
  const [mapStyle, setMapStyle] = useState(PRIMARY_STYLE)
  const [cursor,   setCursor]   = useState('default')
  const [showTransit,  setShowTransit]  = useState(false)
  const [transitData,  setTransitData]  = useState<GeoJSON.FeatureCollection | null>(null)
  const [stationsData, setStationsData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [arrData,      setArrData]      = useState<GeoJSON.FeatureCollection | null>(null)
  const [stationPopup, setStationPopup] = useState<{ longitude: number; latitude: number; name: string; lines: string } | null>(null)
  const geojson = eventsToGeoJSON(events)

  // Filtre des contours : uniquement les arrondissements parisiens sélectionnés (0 = "Autre", pas de polygone).
  const arrFilter: any[] = ['in', ['get', 'c_ar'], ['literal', selectedArr.filter(a => a > 0)]]

  // Chargement lazy des tracés + stations métro/RER : seulement au 1er affichage du calque.
  useEffect(() => {
    if (!showTransit) return
    if (!transitData) {
      fetch('/data/transit.json', { cache: 'force-cache' })
        .then(r => r.ok ? r.json() as Promise<GeoJSON.FeatureCollection> : null)
        .then(d => { if (d) setTransitData(d) })
        .catch(() => {})
    }
    if (!stationsData) {
      fetch('/data/stations.json', { cache: 'force-cache' })
        .then(r => r.ok ? r.json() as Promise<GeoJSON.FeatureCollection> : null)
        .then(d => { if (d) setStationsData(d) })
        .catch(() => {})
    }
  }, [showTransit, transitData, stationsData])

  // Masquer le calque cache aussi le popup de station.
  useEffect(() => { if (!showTransit) setStationPopup(null) }, [showTransit])

  // Chargement lazy des contours d'arrondissements : au 1er arrondissement sélectionné.
  useEffect(() => {
    if (arrData || selectedArr.length === 0) return
    fetch('/data/arrondissements.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() as Promise<GeoJSON.FeatureCollection> : null)
      .then(d => { if (d) setArrData(d) })
      .catch(() => {})
  }, [selectedArr, arrData])

  // Mise à jour impérative du filtre des contours (le filtre déclaratif ne se ré-applique
  // pas toujours sans remount sur maplibre-gl — même contrainte que events-unclustered).
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.getLayer('arr-outline')) return
    try {
      map.setFilter('arr-outline', arrFilter as any)
      map.setFilter('arr-fill', arrFilter as any)
    } catch {/* style not ready yet */}
  }, [selectedArr, arrData, mapRef]) // eslint-disable-line react-hooks/exhaustive-deps
  const rafRef  = useRef<number>(0)
  const sliderTsRef = useRef(sliderTime.getTime())

  useEffect(() => { sliderTsRef.current = sliderTime.getTime() }, [sliderTime])

  // Apply filter imperatively whenever mapFilter changes (declarative Layer filter
  // doesn't update after first render without full re-mount in some maplibre-gl builds)
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return
    try {
      map.setFilter('events-unclustered', mapFilter as any)
    } catch {/* style not ready yet */}
  }, [mapFilter, mapRef])

  // Pulse animation: highlight up to 5 events starting within the next hour
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const startPulse = () => {
      const sliderTs = sliderTsRef.current
      const oneHour  = 3_600_000
      const imminentIds = events
        .filter(e => {
          const s = new Date(e.start_time).getTime()
          return s >= sliderTs && s - sliderTs < oneHour
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5)
        .map(e => e.id)

      if (imminentIds.length > 0) {
        try {
          map.setFilter('events-pulse', ['in', 'id', ['literal', imminentIds]] as any)
        } catch {/* ignore */}
      } else {
        try { map.setFilter('events-pulse', ['==', 'id', ''] as any) } catch {/* ignore */}
      }

      let t = 0
      const animate = () => {
        t += 0.04
        const radius  = 9 + 5 * Math.abs(Math.sin(t))
        const opacity = 0.6 + 0.35 * Math.abs(Math.cos(t))
        try {
          map.setPaintProperty('events-pulse', 'circle-radius', radius)
          map.setPaintProperty('events-pulse', 'circle-opacity', opacity)
        } catch {/* style changed */}
        rafRef.current = requestAnimationFrame(animate)
      }
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }

    if (map.isStyleLoaded()) {
      startPulse()
    } else {
      map.once('load', startPulse)
    }

    return () => { cancelAnimationFrame(rafRef.current) }
  }, [events, mapRef, sliderTime])

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    // N'interroger que les layers réellement présents : queryRenderedFeatures
    // renvoie [] si UN layer listé n'existe pas (ex. 'transit-stations' tant que
    // le calque métro n'a pas été activé) → sinon tout clic est avalé.
    const queryLayers = ['events-unclustered', 'events-clusters', 'transit-stations']
      .filter(id => map.getLayer(id))
    const features = map.queryRenderedFeatures(e.point, { layers: queryLayers })
    if (!features.length) return

    const f = features[0]
    if (f.layer.id === 'transit-stations') {
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      setStationPopup({
        longitude: coords[0],
        latitude: coords[1],
        name: (f.properties?.name as string) ?? 'Station',
        lines: (f.properties?.lines as string) ?? '',
      })
      return
    }
    if (f.layer.id === 'events-clusters') {
      const clusterId = f.properties?.cluster_id as number
      const source = map.getSource('events') as any
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      // maplibre-gl v5 : getClusterExpansionZoom renvoie une Promise (plus de callback).
      // Promise.resolve(...) reste robuste quelle que soit la forme retournée.
      Promise.resolve(source?.getClusterExpansionZoom(clusterId))
        .then((zoom: number) => {
          map.easeTo({ center: coords, zoom: (zoom ?? map.getZoom() + 2) + 0.25, duration: 500 })
        })
        .catch(() => {
          map.easeTo({ center: coords, zoom: map.getZoom() + 2, duration: 500 })
        })
      return
    }

    const eventId = f.properties?.id as string
    const event   = events.find(ev => ev.id === eventId)
    if (event) onEventClick(event)
  }, [events, onEventClick, mapRef])

  const handleMouseEnter = useCallback(() => setCursor('pointer'), [])
  const handleMouseLeave = useCallback(() => setCursor('default'), [])

  return (
    <>
    <MapGL
      ref={mapRef as React.RefObject<MapRef>}
      initialViewState={{ longitude: 2.3488, latitude: 48.8534, zoom: 12 }}
      minZoom={10}
      maxZoom={18}
      mapStyle={mapStyle}
      cursor={cursor}
      interactiveLayerIds={stationsData
        ? ['events-unclustered', 'events-clusters', 'transit-stations']
        : ['events-unclustered', 'events-clusters']}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onStyleData={() => {
        const map = mapRef.current?.getMap()
        if (!map) return
        // Masquer les POI de transport du fond de carte (arrêts bus / gares / stations) : bruit visuel.
        if (map.getLayer('poi_transit')) {
          try { map.setLayoutProperty('poi_transit', 'visibility', 'none') } catch {/* style not ready */}
        }
        if (map.getLayer('events-unclustered')) {
          map.setFilter('events-unclustered', mapFilter as any)
        }
      }}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      {/* Contours des arrondissements sélectionnés — sous les concerts */}
      {arrData && (
        <Source id="arrondissements" type="geojson" data={arrData}>
          <Layer {...arrFillLayer}    beforeId="events-clusters" filter={arrFilter as any} />
          <Layer {...arrOutlineLayer} beforeId="events-clusters" filter={arrFilter as any} />
        </Source>
      )}

      {/* Tracés métro/RER — sous les concerts (beforeId), masqués tant que le calque est off */}
      {transitData && (
        <Source id="transit" type="geojson" data={transitData}>
          <Layer
            {...transitCasingLayer}
            beforeId="events-clusters"
            layout={{ ...transitCasingLayer.layout, visibility: showTransit ? 'visible' : 'none' }}
          />
          <Layer
            {...transitLineLayer}
            beforeId="events-clusters"
            layout={{ ...transitLineLayer.layout, visibility: showTransit ? 'visible' : 'none' }}
          />
        </Source>
      )}

      {/* Stations métro/RER — points cliquables, au-dessus des lignes mais sous les concerts */}
      {stationsData && (
        <Source id="stations" type="geojson" data={stationsData}>
          <Layer
            {...stationLayer}
            beforeId="events-clusters"
            layout={{ visibility: showTransit ? 'visible' : 'none' }}
          />
        </Source>
      )}

      {stationPopup && (
        <Popup
          longitude={stationPopup.longitude}
          latitude={stationPopup.latitude}
          anchor="bottom"
          offset={10}
          closeButton={false}
          onClose={() => setStationPopup(null)}
        >
          <div className="px-1 py-0.5">
            <div className="text-sm font-semibold text-gray-900">{stationPopup.name}</div>
            {stationPopup.lines && (
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">
                Lignes {stationPopup.lines}
              </div>
            )}
          </div>
        </Popup>
      )}

      <Source
        id="events"
        type="geojson"
        data={geojson}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clustersLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredLayer} filter={mapFilter as any} />
        <Layer {...pulseLayer} />
      </Source>

      {/* User location source (injected by UserLocation component via mapRef) */}
      <NavigationControl position="bottom-right" />
    </MapGL>

    {/* Toggle calque métro/RER */}
    <button
      type="button"
      onClick={() => setShowTransit(v => !v)}
      aria-pressed={showTransit}
      className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition ${
        showTransit
          ? 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
          : 'border-border bg-background/95 text-foreground hover:bg-background'
      }`}
    >
      🚇 Métro / RER
    </button>
    </>
  )
}
