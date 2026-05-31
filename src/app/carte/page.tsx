'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapRef } from 'react-map-gl/maplibre'
import { Toaster } from '@/components/ui/sonner'
import { FilterBar }       from '@/components/filters/FilterBar'
import { TimeRangeSlider } from '@/components/filters/TimeRangeSlider'
import { EventPanel }      from '@/components/EventPanel'
import { EventSheet }      from '@/components/EventSheet'
import { UserLocation }    from '@/components/UserLocation'
import { useFilters }      from '@/hooks/useFilters'
import { useUserLocation } from '@/hooks/useUserLocation'
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
    filters, setTimeRange, setGenres, setSubgenres, setOutdoor, setPrice,
    mapFilter, filteredEvents, filteredCount, referenceTime,
  } = useFilters(events)

  const userLocation = useUserLocation()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const onSubgenreClick = (sg: string) => {
    if (!filters.subgenres.includes(sg)) setSubgenres([...filters.subgenres, sg])
  }

  const filterProps = {
    filters,
    filteredEvents,
    filteredCount,
    onGenres:    setGenres,
    onSubgenres: setSubgenres,
    onOutdoor:   setOutdoor,
    onPrice:     setPrice,
  }

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
          />

          {/* Empty state when filters return nothing */}
          {filteredCount === 0 && (
            filters.genres.length > 0 || filters.subgenres.length > 0 ||
            filters.outdoor !== 'all' || filters.price !== 'all'
          ) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-[90vw] px-4 py-2 rounded-full bg-background/95 border shadow-lg text-sm text-center">
              Aucun concert ne correspond à tes filtres.{' '}
              <button
                onClick={() => { setGenres([]); setSubgenres([]) }}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Effacer les filtres
              </button>
            </div>
          )}

          {/* Floating count + Filtres button */}
          <FilterBar {...filterProps} />

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
            onSubgenreClick={onSubgenreClick}
          />
        </div>
      </div>

      {/* ── Time range slider sticky bottom (~72px) ── */}
      <TimeRangeSlider
        value={filters.timeRange as [number, number]}
        onChange={setTimeRange}
      />

      {/* Event detail — mobile bottom sheet */}
      <EventSheet
        event={selectedEvent}
        sliderTime={referenceTime}
        onClose={() => setSelectedEvent(null)}
        onSubgenreClick={onSubgenreClick}
      />

      <Toaster />
    </>
  )
}
