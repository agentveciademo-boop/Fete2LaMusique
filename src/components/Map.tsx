'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, LineLayerSpecification, FillLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Settings, Check } from 'lucide-react'
import { eventsToGeoJSON } from '@/lib/geojson'
import { ensurePieImages, registerPieImageHandler } from '@/lib/genrePin'
import { GENRE_CONFIG } from '@/data/genres'
import { useTranslation } from '@/contexts/LanguageContext'
import type { Event } from '@/types/event'

// Refonte UX : fond SOMBRE par défaut (carte nuit), cohérent avec les pins glow à anneau
// blanc. Fallback positron (clair) gardé en filet de sécurité jour J.
const PRIMARY_STYLE  = process.env.NEXT_PUBLIC_MAP_STYLE_PRIMARY  || 'https://tiles.openfreemap.org/styles/fiord'
const FALLBACK_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_FALLBACK || 'https://tiles.openfreemap.org/styles/positron'

// Fonds proposés à l'utilisateur (bouton ⚙️). Choix mémorisé en localStorage.
const STYLE_STORAGE_KEY = 'fdm-map-style'
const STYLE_OPTIONS = [
  { label: 'Sombre', url: 'https://tiles.openfreemap.org/styles/dark' },
  { label: 'Bleu',   url: 'https://tiles.openfreemap.org/styles/fiord' },
  { label: 'Clair',  url: 'https://tiles.openfreemap.org/styles/positron' },
]

// Couleur du halo "pulse" (concerts imminents). Les pins eux-mêmes sont des
// camemberts colorés par genre (cf. pinsLayer + drawPie) : un concert multi-genres
// montre honnêtement ses parts plutôt qu'une couleur unique trompeuse.
const CONCERT_COLOR = '#FF6B6B'

// Pins « goutte » colorés par genre : la génération canvas est déportée dans
// lib/genrePin.ts (partagée avec l'écran Affluence). Clé d'icône = `pie_key`
// (ex. "jazz+rock", suffixe "|book" pour « sur réservation »).

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
    'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 0.78, 17, 0.95],
    // La POINTE de la goutte est ancrée sur le lieu exact (bas de l'icône).
    'icon-anchor': 'bottom',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
}

// Couleur du genre dominant (genre_primary) → expression `match` MapLibre. Sert au halo glow.
const GENRE_COLOR_MATCH: any = [
  'match', ['get', 'genre_primary'],
  ...Object.entries(GENRE_CONFIG).flatMap(([g, cfg]) => [g, cfg.color]),
  '#9D97B0',
]

// Halo « lumière de la ville » : disque flou coloré par le genre dominant, SOUS chaque pin.
// Reproduit l'effet glow des points (impossible en box-shadow sur une icône canvas).
const glowLayer: CircleLayerSpecification = {
  id: 'events-glow',
  type: 'circle',
  source: 'events',
  paint: {
    'circle-color': GENRE_COLOR_MATCH,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 13, 17, 17],
    'circle-blur': 1,
    'circle-opacity': 0.55,
    // Pin ancré par la pointe → on remonte le halo sous la TÊTE de la goutte.
    'circle-translate': ['interpolate', ['linear'], ['zoom'], 10, ['literal', [0, -10]], 17, ['literal', [0, -16]]],
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

// Services publics (toilettes / fontaines) — petits points cliquables. minzoom élevé :
// ~1800 points noieraient la carte au niveau "Paris entier", or ils ne servent qu'une
// fois zoomé sur son quartier. Ils ne se révèlent donc qu'à partir du zoom 13.
const POI_MIN_ZOOM = 13
const TOILET_COLOR   = '#22C55E' // vert
const FOUNTAIN_COLOR = '#3B82F6' // bleu

const toiletsLayer: CircleLayerSpecification = {
  id: 'toilettes',
  type: 'circle',
  source: 'toilettes',
  minzoom: POI_MIN_ZOOM,
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3.5, 17, 6],
    'circle-color': TOILET_COLOR,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9,
  },
}

const fountainsLayer: CircleLayerSpecification = {
  id: 'fontaines',
  type: 'circle',
  source: 'fontaines',
  minzoom: POI_MIN_ZOOM,
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3.5, 17, 6],
    'circle-color': FOUNTAIN_COLOR,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9,
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

// Halo jaune statique sous les pins « Sur réservation » (requires_booking). Disque
// flouté légèrement plus large que le pin → un glow jaune dépasse autour du camembert,
// pour repérer d'un coup d'œil les concerts à réserver (cf. badge 🎟️ sur la fiche).
const BOOKING_COLOR = '#FFC400'
const bookingHaloLayer: CircleLayerSpecification = {
  id: 'events-booking',
  type: 'circle',
  source: 'events',
  filter: ['==', ['get', 'requires_booking'], 1],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 13, 14, 17, 17, 21],
    'circle-color': BOOKING_COLOR,
    'circle-opacity': 0.8,
    'circle-blur': 0.35,
    'circle-translate': ['interpolate', ['linear'], ['zoom'], 10, ['literal', [0, -10]], 17, ['literal', [0, -16]]],
  },
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
    'circle-translate': [0, -13],
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
  const { t } = useTranslation()
  const [mapStyle, setMapStyle] = useState(PRIMARY_STYLE)
  const [cursor,   setCursor]   = useState('default')
  const [showTransit,   setShowTransit]   = useState(false)
  const [showToilets,   setShowToilets]   = useState(false)
  const [showFountains, setShowFountains] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [transitData,  setTransitData]  = useState<GeoJSON.FeatureCollection | null>(null)
  const [stationsData, setStationsData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [toiletsData,  setToiletsData]  = useState<GeoJSON.FeatureCollection | null>(null)
  const [fountainsData, setFountainsData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [arrData,      setArrData]      = useState<GeoJSON.FeatureCollection | null>(null)
  const [stationPopup, setStationPopup] = useState<{ longitude: number; latitude: number; name: string; lines: string } | null>(null)
  // Popup générique pour les services publics (toilettes / fontaines).
  const [poiPopup, setPoiPopup] = useState<{ longitude: number; latitude: number; title: string; lines: string[] } | null>(null)
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

  // Chargement lazy des toilettes publiques : seulement au 1er affichage du calque.
  useEffect(() => {
    if (!showToilets || toiletsData) return
    fetch('/data/toilettes.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() as Promise<GeoJSON.FeatureCollection> : null)
      .then(d => { if (d) setToiletsData(d) })
      .catch(() => {})
  }, [showToilets, toiletsData])

  // Chargement lazy des fontaines à boire : seulement au 1er affichage du calque.
  useEffect(() => {
    if (!showFountains || fountainsData) return
    fetch('/data/fontaines.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() as Promise<GeoJSON.FeatureCollection> : null)
      .then(d => { if (d) setFountainsData(d) })
      .catch(() => {})
  }, [showFountains, fountainsData])

  // Couper un calque service ferme aussi son popup éventuel.
  useEffect(() => { if (!showToilets && !showFountains) setPoiPopup(null) }, [showToilets, showFountains])

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
      if (map.getLayer('events-glow')) map.setFilter('events-glow', mapFilter as any)
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

      // Garde `getLayer` : pendant un changement de fond, le layer disparaît brièvement.
      // maplibre *émet* (ne *jette* pas) une erreur "non-existing layer" → try/catch inutile.
      if (map.getLayer('events-pulse')) {
        map.setFilter('events-pulse', imminentIds.length > 0
          ? (['in', 'id', ['literal', imminentIds]] as any)
          : (['==', 'id', ''] as any))
      }

      let t = 0
      const animate = () => {
        t += 0.04
        if (map.getLayer('events-pulse')) {
          const radius  = 16 + 7 * Math.abs(Math.sin(t))
          const opacity = 0.3 + 0.25 * Math.abs(Math.cos(t))
          map.setPaintProperty('events-pulse', 'circle-radius', radius)
          map.setPaintProperty('events-pulse', 'circle-opacity', opacity)
        }
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
    const queryLayers = ['events-unclustered', 'transit-stations', 'toilettes', 'fontaines']
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
    if (f.layer.id === 'toilettes') {
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      const p = f.properties ?? {}
      const lines = [
        p.adresse as string,
        p.horaire ? `Horaires : ${p.horaire}` : '',
        p.pmr ? '♿ Accès PMR' : '',
        p.relais_bebe ? '🍼 Relais bébé' : '',
      ].filter(Boolean)
      setPoiPopup({ longitude: coords[0], latitude: coords[1], title: `🚻 ${p.type || 'Toilettes'}`, lines })
      return
    }
    if (f.layer.id === 'fontaines') {
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      const p = f.properties ?? {}
      const lines = [p.adresse as string, p.commune as string].filter(Boolean)
      setPoiPopup({ longitude: coords[0], latitude: coords[1], title: `🚰 ${p.type || 'Fontaine'}`, lines })
      return
    }
    const eventId = f.properties?.id as string
    const event   = events.find(ev => ev.id === eventId)
    if (event) onEventClick(event)
  }, [events, onEventClick, mapRef])

  const handleMouseEnter = useCallback(() => setCursor('pointer'), [])
  const handleMouseLeave = useCallback(() => setCursor('default'), [])

  // Restaure le fond de carte choisi précédemment (localStorage).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_STORAGE_KEY)
      if (saved && STYLE_OPTIONS.some(o => o.url === saved)) setMapStyle(saved)
    } catch {/* localStorage indispo */}
  }, [])

  const chooseStyle = useCallback((url: string) => {
    setMapStyle(url)
    setShowStyleMenu(false)
    try { localStorage.setItem(STYLE_STORAGE_KEY, url) } catch {/* ignore */}
  }, [])

  // Génère les icônes goutte à la demande : MapLibre réclame chaque image manquante
  // (id = pie_key) via `styleimagemissing` ; le handler (lib/genrePin) la dessine et la
  // fournit, et survit aux changements de fond de carte.
  const handleLoad = useCallback((e: { target: any }) => {
    registerPieImageHandler(e.target)
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
      interactiveLayerIds={[
        'events-unclustered',
        ...(stationsData ? ['transit-stations'] : []),
        ...(toiletsData ? ['toilettes'] : []),
        ...(fountainsData ? ['fontaines'] : []),
      ]}
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
        if (map.getLayer('events-glow')) {
          map.setFilter('events-glow', mapFilter as any)
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

      {/* Toilettes publiques — points cliquables, sous les concerts, dès le zoom 13 */}
      {toiletsData && (
        <Source id="toilettes" type="geojson" data={toiletsData}>
          <Layer
            {...toiletsLayer}
            beforeId="events-unclustered"
            layout={{ visibility: showToilets ? 'visible' : 'none' }}
          />
        </Source>
      )}

      {/* Fontaines à boire — points cliquables, sous les concerts, dès le zoom 13 */}
      {fountainsData && (
        <Source id="fontaines" type="geojson" data={fountainsData}>
          <Layer
            {...fountainsLayer}
            beforeId="events-unclustered"
            layout={{ visibility: showFountains ? 'visible' : 'none' }}
          />
        </Source>
      )}

      {poiPopup && (
        <Popup
          longitude={poiPopup.longitude}
          latitude={poiPopup.latitude}
          anchor="bottom"
          offset={10}
          closeButton={false}
          onClose={() => setPoiPopup(null)}
        >
          <div className="px-1 py-0.5">
            <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,.9)' }}>{poiPopup.title}</div>
            {poiPopup.lines.map((l, i) => (
              <div key={i} className="mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>{l}</div>
            ))}
          </div>
        </Popup>
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
            <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,.9)' }}>{stationPopup.name}</div>
            {stationPopup.lines && (
              <div className="mt-0.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
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
        {/* Halos SOUS les pins (rendus en premier) : glow par genre + pulse imminent +
            jaune réservation, puis les camemberts au-dessus */}
        <Layer {...glowLayer} filter={mapFilter as any} />
        <Layer {...pulseLayer} />
        <Layer {...bookingHaloLayer} />
        <Layer {...pinsLayer} filter={mapFilter as any} />
      </Source>

      {/* User location source (injected by UserLocation component via mapRef) */}
      <NavigationControl position="bottom-right" />
    </MapGL>

    {/* Bouton ⚙️ paramètres d'affichage : choix du fond de carte (mémorisé). Placé sous
        la barre de recherche + le rail de genres + la chip EN DIRECT (refonte UX). */}
    <div className="absolute top-[150px] right-3 z-20">
      <button
        type="button"
        onClick={() => setShowStyleMenu(v => !v)}
        aria-label="Affichage de la carte"
        aria-expanded={showStyleMenu}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 shadow-lg backdrop-blur transition"
        style={{ background: 'var(--ink-700)', color: 'rgba(255,255,255,.8)' }}
      >
        <Settings className="h-4 w-4" />
      </button>
      {showStyleMenu && (
        <div className="absolute right-0 mt-2 min-w-[150px] rounded-xl p-1.5 shadow-xl backdrop-blur"
          style={{ background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,.12)' }}>
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Fond de carte</p>
          {STYLE_OPTIONS.map(o => (
            <button
              key={o.url}
              type="button"
              onClick={() => chooseStyle(o.url)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition"
              style={mapStyle === o.url
                ? { background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.95)', fontWeight: 600 }
                : { color: 'rgba(255,255,255,.65)' }
              }
            >
              {o.label}
              {mapStyle === o.url && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Toggle calque métro/RER */}
    <button
      type="button"
      onClick={() => setShowTransit(v => !v)}
      aria-pressed={showTransit}
      className={`absolute top-[194px] right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition ${
        showTransit
          ? 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
          : 'border-border bg-background/95 text-foreground hover:bg-background'
      }`}
    >
      {t.layerMetro}
    </button>

    {/* Toggle calque toilettes publiques */}
    <button
      type="button"
      onClick={() => setShowToilets(v => !v)}
      aria-pressed={showToilets}
      className={`absolute top-[238px] right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition ${
        showToilets
          ? 'border-[#22C55E] bg-[#22C55E] text-white'
          : 'border-border bg-background/95 text-foreground hover:bg-background'
      }`}
    >
      {t.layerToilets}
    </button>

    {/* Toggle calque fontaines à boire */}
    <button
      type="button"
      onClick={() => setShowFountains(v => !v)}
      aria-pressed={showFountains}
      className={`absolute top-[282px] right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition ${
        showFountains
          ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
          : 'border-border bg-background/95 text-foreground hover:bg-background'
      }`}
    >
      {t.layerFountains}
    </button>
    </>
  )
}
