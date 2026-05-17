'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapRef } from 'react-map-gl/maplibre'
import { Toaster } from '@/components/ui/sonner'
import { Header }      from '@/components/Header'
import { FilterBar }   from '@/components/filters/FilterBar'
import { FilterSheet } from '@/components/filters/FilterSheet'
import { EventPanel }  from '@/components/EventPanel'
import { EventSheet }  from '@/components/EventSheet'
import { UserLocation } from '@/components/UserLocation'
import { useSliderTime } from '@/hooks/useSliderTime'
import { useFilters }   from '@/hooks/useFilters'
import { useUserLocation } from '@/hooks/useUserLocation'
import MOCK_EVENTS from '@/data/mock-events'
import type { Event } from '@/types/event'

// SSR-safe: MapLibre needs the browser
const MapView = dynamic(() => import('@/components/Map').then(m => m.MapView), { ssr: false })

export default function Page() {
  const events = MOCK_EVENTS
  const mapRef = useRef<MapRef | null>(null)

  const { sliderTime, sliderMinutes, setSliderMinutes, resetToNow } = useSliderTime()
  const { filters, setGenres, setOutdoor, setPrice, mapFilter, filteredEvents, filteredCount } = useFilters(events, sliderTime)
  const userLocation = useUserLocation()

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const filterProps = {
    sliderMinutes,
    sliderTime,
    filters,
    filteredCount,
    onSliderChange: setSliderMinutes,
    onSliderReset:  resetToNow,
    onGenres:  setGenres,
    onOutdoor: setOutdoor,
    onPrice:   setPrice,
  }

  return (
    <>
      <Header filteredCount={filteredCount} />

      {/* Filter bar desktop — sits right under the fixed header */}
      <div className="fixed top-14 left-0 right-0 z-40">
        <FilterBar {...filterProps} />
      </div>

      {/* Map area — full screen minus header (+ filter bar on desktop) */}
      <div className="fixed inset-0 top-14 md:top-28">
        <div className="relative w-full h-full">
          <MapView
            events={filteredEvents}
            mapFilter={mapFilter}
            sliderTime={sliderTime}
            onEventClick={setSelectedEvent}
            mapRef={mapRef}
          />

          {/* Mobile filter trigger */}
          <FilterSheet {...filterProps} />

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
            sliderTime={sliderTime}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      </div>

      {/* Event detail — mobile bottom sheet */}
      <EventSheet
        event={selectedEvent}
        sliderTime={sliderTime}
        onClose={() => setSelectedEvent(null)}
      />

      <Toaster />
    </>
  )
}
