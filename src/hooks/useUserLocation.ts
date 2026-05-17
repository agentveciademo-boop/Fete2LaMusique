import { useState, useCallback } from 'react'

export interface UserLocation {
  lat: number
  lng: number
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('Permission de géolocalisation refusée.')
        setLoading(false)
      }
    )
  }, [])

  return { location, error, loading, locate }
}
