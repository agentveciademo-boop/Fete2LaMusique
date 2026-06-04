'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, LineLayerSpecification, FillLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { eventsToGeoJSON } from '@/lib/geojson'
import { GENRE_CONFIG } from '@/data/genres'
import type { Event, Genre } from '@/types/event'

const PRIMARY_STYLE  = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY  || 'https://tiles.openfreemap.org/styles/liberty'
const FALLBACK_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_FALLBACK || 'https://tiles.openfreemap.org/styles/liberty'

// Couleur du halo "pulse" (concerts imminents). Les pins eux-mêmes sont des
// camemberts colorés par genre (cf. pinsLayer + drawPie) : un concert multi-genres
// montre honnêtement ses parts plutôt qu'une couleur unique trompeuse.
const CONCERT_COLOR = '#FF6B6B'

// --- Icônes camembert ---------------------------------------------------------
// Un pin = un mini-camembert : une part par genre (couleurs de GENRE_CONFIG).
// Les images sont générées à la demande via l'événement MapLibre `styleimagemissing`
// (l'id de l'image = `pie_key`, ex. "jazz+rock"). Rendu canvas, mis en cache par la map.
const ICON_PX = 44 // taille intrinsèque (à pixelRatio) ; icon-size ajuste l'affichage

function drawPieIcon(genres: Genre[]): { data: ImageData; pixelRatio: number } | null {
  const dpr = Math.max(2, Math.round(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  canvas.width = ICON_PX * dpr
  canvas.height = ICON_PX * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(dpr, dpr)
  const cx = ICON_PX / 2, cy = ICON_PX / 2, r = ICON_PX / 2 - 3
  const list = genres.length ? genres : (['autres'] as Genre[])
  const step = (Math.PI * 2) / list.length
  let a = -Math.PI / 2 // départ en haut
  for (const g of list) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, a, a + step)
    ctx.closePath()
    ctx.fillStyle = GENRE_CONFIG[g]?.color ?? '#6B7280'
    ctx.fill()
    a += step
  }
  // Séparateurs blancs entre parts (lisibilité du multi-genres).
  if (list.length > 1) {
    a = -Math.PI / 2
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.2
    for (let i = 0; i < list.length; i++) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      ctx.stroke()
      a += step
    }
  }
  // Anneau blanc extérieur (détache le pin du fond de carte).
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: dpr }
}

// Pré-génère et enregistre toutes les icônes camembert nécessaires (une par combinaison
// de genres présente dans les events). Idempotent (hasImage). Plus fiable que de compter
// sur `styleimagemissing`, qui peut se déclencher avant que le handler soit branché.
function ensurePieImages(map: any, events: Event[]): void {
  for (const ev of events) {
    const g = ev.genres.slice(0, 4)
    const key = g.join('+')
    if (!key || map.hasImage(key)) continue
    const icon = drawPieIcon(g as Genre[])
    if (icon) map.addImage(key, icon.data, { pixelRatio: icon.pixelRatio })
  }
}

// Layers du fond de carte (OpenFreeMap Liberty) qu'on masque pour une carte épurée :
// - poi_* : icônes/labels des commerces, lieux, et arrêts de transport (bruit visuel)
// - building-3d : extrusion 3D des bâtiments au zoom — on garde la carte en 2D à plat
const HIDDEN_BASEMAP_LAYERS = ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit', 'building-3d']

// Pins = camemberts (symbol). On garde l'id 'events-unclustered' : clic, filtre genre/horaire
// et interactivité restent câblés dessus sans changement ailleurs.
const pinsLayer: SymbolLayerSpecification = {
  id: 'events-unclustered',
  type: 'symbol',
  source: 'events',
  layout: {
    'icon-image': ['get', 'pie_key'],
    'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.42, 14, 0.5, 17, 0.6],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
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

// Halo pulsant sous les pins camembert (concerts imminents). Plus large que le pin
// pour rester visible derrière l'icône ; corail translucide, sans contour.
const pulseLayer: CircleLayerSpecification = {
  id: 'events-pulse',
  type: 'circle',
  source: 'events',
  filter: ['==', 'id', ''],
  paint: {
    'circle-radius': 16,
    'circle-color': CONCERT_COLOR,
    'circle-opacity': 0.45,
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

  // Pré-génère les icônes camembert dès que les events (mocks → JSON réel) sont prêts.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (map.isStyleLoaded()) ensurePieImages(map, events)
    else map.once('styledata', () => ensurePieImages(map, events))
  }, [events, mapRef])

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
        const radius  = 16 + 7 * Math.abs(Math.sin(t))
        const opacity = 0.3 + 0.25 * Math.abs(Math.cos(t))
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
    const queryLayers = ['events-unclustered', 'transit-stations']
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
    const eventId = f.properties?.id as string
    const event   = events.find(ev => ev.id === eventId)
    if (event) onEventClick(event)
  }, [events, onEventClick, mapRef])

  const handleMouseEnter = useCallback(() => setCursor('pointer'), [])
  const handleMouseLeave = useCallback(() => setCursor('default'), [])

  // Génère les icônes camembert à la demande : MapLibre réclame chaque image manquante
  // (id = pie_key, ex. "jazz+rock") via `styleimagemissing`, on la dessine et la fournit.
  // Le handler survit aux changements de fond de carte (les images sont alors re-réclamées).
  const handleLoad = useCallback((e: { target: any }) => {
    const map = e.target
    const onMissing = (ev: { id: string }) => {
      if (!ev.id || map.hasImage(ev.id)) return
      const genres = ev.id.split('+').filter((g: string): g is Genre => g in GENRE_CONFIG)
      const icon = drawPieIcon(genres)
      if (icon && !map.hasImage(ev.id)) map.addImage(ev.id, icon.data, { pixelRatio: icon.pixelRatio })
    }
    map.on('styleimagemissing', onMissing)
  }, [])

  return (
    <>
    <MapGL
      ref={mapRef as React.RefObject<MapRef>}
      initialViewState={{ longitude: 2.3488, latitude: 48.8534, zoom: 12 }}
      minZoom={10}
      maxZoom={18}
      mapStyle={mapStyle}
      cursor={cursor}
      onLoad={handleLoad}
      interactiveLayerIds={stationsData
        ? ['events-unclustered', 'transit-stations']
        : ['events-unclustered']}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onStyleData={() => {
        const map = mapRef.current?.getMap()
        if (!map) return
        // (Re)génère les icônes camembert après tout (re)chargement de style (ex. swap de fond).
        ensurePieImages(map, events)
        // Carte épurée : masquer les POI (commerces, lieux, arrêts) et les bâtiments 3D du fond de carte.
        for (const id of HIDDEN_BASEMAP_LAYERS) {
          if (map.getLayer(id)) {
            try { map.setLayoutProperty(id, 'visibility', 'none') } catch {/* style not ready */}
          }
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
          <Layer {...arrFillLayer}    beforeId="events-unclustered" filter={arrFilter as any} />
          <Layer {...arrOutlineLayer} beforeId="events-unclustered" filter={arrFilter as any} />
        </Source>
      )}

      {/* Tracés métro/RER — sous les concerts (beforeId), masqués tant que le calque est off */}
      {transitData && (
        <Source id="transit" type="geojson" data={transitData}>
          <Layer
            {...transitCasingLayer}
            beforeId="events-unclustered"
            layout={{ ...transitCasingLayer.layout, visibility: showTransit ? 'visible' : 'none' }}
          />
          <Layer
            {...transitLineLayer}
            beforeId="events-unclustered"
            layout={{ ...transitLineLayer.layout, visibility: showTransit ? 'visible' : 'none' }}
          />
        </Source>
      )}

      {/* Stations métro/RER — points cliquables, au-dessus des lignes mais sous les concerts */}
      {stationsData && (
        <Source id="stations" type="geojson" data={stationsData}>
          <Layer
            {...stationLayer}
            beforeId="events-unclustered"
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
      >
        {/* Halo pulse SOUS les pins (rendu en premier), puis les camemberts au-dessus */}
        <Layer {...pulseLayer} />
        <Layer {...pinsLayer} filter={mapFilter as any} />
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
