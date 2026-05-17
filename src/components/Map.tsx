'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { eventsToGeoJSON } from '@/lib/geojson'
import { GENRE_CONFIG } from '@/data/genres'
import type { Event, Genre } from '@/types/event'

const PRIMARY_STYLE  = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY  || 'https://tiles.openfreemap.org/styles/liberty'
const FALLBACK_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_FALLBACK || 'https://tiles.openfreemap.org/styles/liberty'

const GENRE_COLOR_EXPR = [
  'match', ['get', 'genre_primary'],
  ...Object.entries(GENRE_CONFIG).flatMap(([genre, cfg]) => [genre, cfg.color]),
  '#6B7280',
] as any

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
    'circle-color': GENRE_COLOR_EXPR,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
    'circle-opacity': 0.95,
  },
}

const pulseLayer: CircleLayerSpecification = {
  id: 'events-pulse',
  type: 'circle',
  source: 'events',
  filter: ['==', 'id', ''],
  paint: {
    'circle-radius': 9,
    'circle-color': GENRE_COLOR_EXPR,
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
}

export function MapView({ events, mapFilter, sliderTime, onEventClick, mapRef }: Props) {
  const [mapStyle, setMapStyle] = useState(PRIMARY_STYLE)
  const [cursor,   setCursor]   = useState('default')
  const geojson = eventsToGeoJSON(events)
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
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['events-unclustered', 'events-clusters'],
    })
    if (!features.length) return

    const f = features[0]
    if (f.layer.id === 'events-clusters') {
      const clusterId = f.properties?.cluster_id as number
      const source = map.getSource('events') as any
      source?.getClusterExpansionZoom(clusterId, (_err: unknown, zoom: number) => {
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
        map.flyTo({ center: coords, zoom: zoom ?? map.getZoom() + 2 })
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
    <MapGL
      ref={mapRef as React.RefObject<MapRef>}
      initialViewState={{ longitude: 2.3488, latitude: 48.8534, zoom: 12 }}
      minZoom={10}
      maxZoom={18}
      mapStyle={mapStyle}
      cursor={cursor}
      interactiveLayerIds={['events-unclustered', 'events-clusters']}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onStyleData={() => {
        const map = mapRef.current?.getMap()
        if (!map || !map.getLayer('events-unclustered')) return
        map.setFilter('events-unclustered', mapFilter as any)
      }}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
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
  )
}
