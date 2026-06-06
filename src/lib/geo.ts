// Utilitaires géographiques pour la refonte UX (radar, itinéraire, temps de marche).

const EARTH_RADIUS_M = 6_371_000
// Vitesse de marche piéton en ville ≈ 4,8 km/h ≈ 80 m/min (légèrement prudent : feux, monde).
const WALK_METERS_PER_MIN = 80

export interface LatLng {
  lat: number
  lng: number
}

/** Distance à vol d'oiseau entre deux points, en mètres (formule de haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Temps de marche estimé (minutes, arrondi, min. 1) pour une distance en mètres. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN))
}

/** Distance formatée façon maquette : « 450 m » sous 1 km, « 1,2 km » au-delà. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

/** Relèvement (cap) de `from` vers `to`, en degrés depuis le nord (0–360, sens horaire). */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const lat1 = toRad(from.lat), lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}
