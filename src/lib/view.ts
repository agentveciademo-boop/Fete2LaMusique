// Helpers de présentation pour les écrans de la refonte UX : dérivent d'un Event
// les champs « view-model » (genre dominant, horaire HH:mm, marche/distance) sans
// dupliquer la logique métier dans chaque page.

import type { Event, Genre } from '@/types/event'
import { GENRE_CONFIG } from '@/data/genres'
import { formatClock } from '@/lib/time'
import { haversineMeters, walkMinutes, formatDistance, type LatLng } from '@/lib/geo'

/** Genre dominant d'un concert (1er de la liste, « autres » par défaut). */
export function primaryGenre(e: Event): Genre {
  return (e.genres[0] ?? 'autres') as Genre
}

export function genreColor(g: Genre): string {
  return GENRE_CONFIG[g]?.color ?? '#9D97B0'
}

export function genreLabel(g: Genre): string {
  return GENRE_CONFIG[g]?.label ?? 'Autres'
}

/** Plage horaire « 16:00 – 19:30 » (Europe/Paris). */
export function timeRange(e: Event): string {
  return `${formatClock(e.start_time)} – ${formatClock(e.end_time)}`
}

export interface WalkInfo {
  minutes: number
  distanceLabel: string
}

/** Marche + distance depuis la position utilisateur, ou null si position inconnue. */
export function walkFrom(origin: LatLng | null, e: Event): WalkInfo | null {
  if (!origin) return null
  const meters = haversineMeters(origin, { lat: e.lat, lng: e.lng })
  return { minutes: walkMinutes(meters), distanceLabel: formatDistance(meters) }
}

/** Libellé de prix court pour les cartes (« Gratuit », « Prix libre », « Payant »). */
export function priceLabel(e: Event): string {
  switch (e.price_type) {
    case 'free':      return 'Gratuit'
    case 'prix_libre': return 'Prix libre'
    case 'paid':      return e.price_detail?.trim() || 'Payant'
    default:          return 'Gratuit'
  }
}

/** Minutes avant le début du concert par rapport à un instant de référence. */
export function minutesUntilStart(e: Event, ref: Date): number {
  return Math.round((new Date(e.start_time).getTime() - ref.getTime()) / 60_000)
}
