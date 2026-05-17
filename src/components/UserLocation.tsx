'use client'

import { useEffect } from 'react'
import { Crosshair } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { MapRef } from 'react-map-gl/maplibre'
import type { UserLocation as UL } from '@/hooks/useUserLocation'

interface Props {
  location: UL | null
  error: string | null
  loading: boolean
  mapRef: React.RefObject<MapRef | null>
  onLocate: () => void
}

export function UserLocation({ location, error, loading, mapRef, onLocate }: Props) {
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (!location || !mapRef.current) return
    mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 14, duration: 1500 })
  }, [location, mapRef])

  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={onLocate}
      disabled={loading}
      className="absolute bottom-8 left-3 z-10 rounded-full shadow-lg bg-white/90 text-foreground hover:bg-white"
      title="Me localiser"
    >
      <Crosshair className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  )
}
