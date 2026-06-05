'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapRef } from 'react-map-gl/maplibre'
import { Toaster } from '@/components/ui/sonner'
import { GenreBar }        from '@/components/filters/GenreBar'
import { ResultCount }     from '@/components/filters/ResultCount'
import { SlotFilter }      from '@/components/filters/SlotFilter'
import { EventPanel }      from '@/components/EventPanel'
import { EventSheet }      from '@/components/EventSheet'
import { UserLocation }    from '@/components/UserLocation'
import { useFilters }      from '@/hooks/useFilters'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useIsMobile }     from '@/hooks/useIsMobile'
import MOCK_EVENTS from '@/data/mock-events'
import type { Event } from '@/types/event'

const MapView = dynamic(() => import('@/components/Map').then(m => m.MapView), { ssr: false })

export default function Page() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS)
  const mapRef = useRef<MapRef | null>(null)

  // Load ETL-produced JSON when available; fall back silently to mocks.
  useEffect(() => {
    fetch('/data/events.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<{ events?: Event[] }> : null)
      .then(data => { if (data?.events?.length) setEvents(data.events) })
      .catch(() => {})
  }, [])

  const {
    filters, setSlot, setGenres, setArrondissements,
    mapFilter, filteredEvents, filteredCount, slotCounts, referenceTime,
  } = useFilters(events)

  const userLocation = useUserLocation()
  const isMobile = useIsMobile()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  return (
    <>
      {/* ── Map area fills space between top and slider (une seule carte, sans onglet Sam/Dim) ── */}
      <div className="fixed inset-x-0" style={{ top: 0, bottom: 72 }}>
        <div className="relative w-full h-full">
          <MapView
            events={filteredEvents}
            mapFilter={mapFilter}
            sliderTime={referenceTime}
            onEventClick={setSelectedEvent}
            mapRef={mapRef}
            selectedArr={filters.arrondissements}
          />

          {/* Filtres (styles + arrondissements) directement sur la carte */}
          <GenreBar
            selected={filters.genres}
            onChange={setGenres}
            arrondissements={filters.arrondissements}
            onChangeArr={setArrondissements}
          />

          {/* Empty state when filters return nothing */}
          {filteredCount === 0 && (filters.slot !== null || filters.genres.length > 0 || filters.arrondissements.length > 0) && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 max-w-[90vw] px-4 py-2 rounded-full bg-background/95 border shadow-lg text-sm text-center">
              Aucun concert ne correspond.{' '}
              <button
                onClick={() => { setSlot(null); setGenres([]); setArrondissements([]) }}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Effacer
              </button>
            </div>
          )}

          {/* Compteur de concerts (flottant, en bas) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-background/90 border shadow-md text-sm">
            <ResultCount count={filteredCount} />
          </div>

          {/* Geolocation button */}
          <UserLocation
            location={userLocation.location}
            error={userLocation.error}
            loading={userLocation.loading}
            mapRef={mapRef}
            onLocate={userLocation.locate}
          />

          {/* Event detail — desktop sidebar */}
          <EventPanel
            event={selectedEvent}
            sliderTime={referenceTime}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      </div>

      {/* ── Filtre par tranche horaire, sticky bottom (~72px) ── */}
      <SlotFilter
        selected={filters.slot}
        counts={slotCounts}
        onChange={setSlot}
      />

      {/* Event detail — mobile bottom sheet (uniquement sur mobile : sur desktop, le
          drawer vaul "ouvert" verrouillait le <body> en pointer-events:none et bloquait
          les clics du panneau latéral). Desktop = EventPanel ci-dessus. */}
      <EventSheet
        event={isMobile ? selectedEvent : null}
        sliderTime={referenceTime}
        onClose={() => setSelectedEvent(null)}
      />

      <Toaster />
    </>
  )
}
