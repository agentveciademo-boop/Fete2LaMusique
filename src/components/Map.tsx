'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, LineLayerSpecification, FillLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Settings, Check } from 'lucide-react'
import { eventsToGeoJSON } from '@/lib/geojson'
import { GENRE_CONFIG } from '@/data/genres'
import type { Event, Genre } from '@/types/event'

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

// Jaune « Sur réservation » : anneau des pins concernés (renfort du halo jaune, cf. bookingHaloLayer).
const BOOKING_RING = '#FFB300'

// --- Pins multi-genres --------------------------------------------------------
// Règle validée (refonte UX, remplace le camembert systématique) :
//   1 genre   → point plein de la couleur du genre + anneau blanc
//   2 genres  → pin scindé 50/50 (diviseur incliné ~15°), le cas le plus fréquent
//   3 genres+ → dominante (1er genre) pleine + pastille « +N » en bas à droite
// Les images sont générées à la demande via `styleimagemissing` (id = `pie_key`,
// ex. "jazz+rock"). Rendu canvas, mis en cache par la map. Anneau jaune épais pour
// les concerts « Sur réservation » (requires_booking).
const ICON_PX = 44 // taille intrinsèque (à pixelRatio) ; icon-size ajuste l'affichage

function drawGenrePin(genres: Genre[], ringColor: string = '#fff', ringWidth: number = 2.5): { data: ImageData; pixelRatio: number } | null {
  const dpr = Math.max(2, Math.round(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  canvas.width = ICON_PX * dpr
  canvas.height = ICON_PX * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(dpr, dpr)

  const cx = ICON_PX / 2, cy = ICON_PX / 2, r = ICON_PX / 2 - 3
  const list = genres.length ? genres : (['autres'] as Genre[])
  const col = (g: Genre) => GENRE_CONFIG[g]?.color ?? '#9D97B0'

  // Disque de base (clip circulaire).
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip()

  if (list.length === 1) {
    ctx.fillStyle = col(list[0]); ctx.fillRect(0, 0, ICON_PX, ICON_PX)
  } else if (list.length === 2) {
    // Pin scindé : deux moitiés, diviseur incliné (~15°) pour matcher la maquette.
    ctx.translate(cx, cy); ctx.rotate((15 * Math.PI) / 180); ctx.translate(-cx, -cy)
    ctx.fillStyle = col(list[0]); ctx.fillRect(-cx, -cy, cx + ICON_PX, ICON_PX * 2) // moitié gauche
    ctx.fillStyle = col(list[1]); ctx.fillRect(cx, -cy, ICON_PX, ICON_PX * 2)       // moitié droite
  } else {
    // 3+ : dominante pleine ; la pastille « +N » est dessinée après le clip.
    ctx.fillStyle = col(list[0]); ctx.fillRect(0, 0, ICON_PX, ICON_PX)
  }
  ctx.restore()

  // Anneau extérieur (détache le pin du fond). Blanc par défaut ; jaune épais à réserver.
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = ringWidth
  ctx.strokeStyle = ringColor
  ctx.stroke()

  // Pastille « +N » pour 3 genres et plus (couleur du 2e genre, liseré encre).
  if (list.length >= 3) {
    const bx = cx + r * 0.62, by = cy + r * 0.62, br = 7
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fillStyle = col(list[1]); ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = '#0B0913'; ctx.stroke()
    ctx.fillStyle = '#0B0913'
    ctx.font = '700 9px monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`+${list.length - 1}`, bx, by + 0.5)
  }

  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: dpr }
}

// Pré-génère et enregistre toutes les icônes camembert nécessaires (une par combinaison
// de genres présente dans les events). Idempotent (hasImage). Plus fiable que de compter
// sur `styleimagemissing`, qui peut se déclencher avant que le handler soit branché.
function ensurePieImages(map: any, events: Event[]): void {
  for (const ev of events) {
    const g = ev.genres.slice(0, 4)
    const base = g.join('+')
    if (!base) continue
    // Concert à réserver = image distincte (suffixe |book) avec anneau jaune épais.
    const key = ev.requires_booking ? `${base}|book` : base
    if (map.hasImage(key)) continue
    const icon = ev.requires_booking
      ? drawGenrePin(g as Genre[], BOOKING_RING, 3.5)
      : drawGenrePin(g as Genre[])
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
    'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 0.62, 17, 0.74],
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
  const [showTransit,   setShowTransit]   = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
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

  // Génère les icônes camembert à la demande : MapLibre réclame chaque image manquante
  // (id = pie_key, ex. "jazz+rock") via `styleimagemissing`, on la dessine et la fournit.
  // Le handler survit aux changements de fond de carte (les images sont alors re-réclamées).
  const handleLoad = useCallback((e: { target: any }) => {
    const map = e.target
    const onMissing = (ev: { id: string }) => {
      if (!ev.id || map.hasImage(ev.id)) return
      // id = "genre+genre" éventuellement suffixé "|book" (à réserver → anneau jaune épais).
      const [genrePart, flag] = ev.id.split('|')
      const genres = genrePart.split('+').filter((g: string): g is Genre => g in GENRE_CONFIG)
      const icon = flag === 'book' ? drawGenrePin(genres, BOOKING_RING, 3.5) : drawGenrePin(genres)
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
      🚇 Métro / RER
    </button>
    </>
  )
}
