import { useState, useMemo, useCallback } from 'react'
import type { Genre, Event } from '@/types/event'
import { SLOTS, type SlotId, eventSlot, eventSessionDate } from '@/lib/slots'

// Jour affiché : dimanche 21 (le vrai jour de la Fête). Les 25 concerts du samedi 20
// sont masqués — données conservées, il suffit de changer cette constante pour les ré-afficher.
export const VISIBLE_SESSION_DATE = '2026-06-21'

export type SlotCounts = Record<SlotId, number>

export interface Filters {
  slot: SlotId | null          // null = toutes les tranches
  genres: Genre[]
  arrondissements: number[]     // 1–20 ; 0 = hors Paris ("Autre"). Vide = tous.
}

// Par défaut : toutes les tranches, aucun genre/arrondissement filtré.
function pickInitialFilters(): Filters {
  return { slot: null, genres: [], arrondissements: [] }
}

interface MapFilterExpr extends Array<unknown> { 0: string }

export function useFilters(events: Event[]) {
  const [filters, setFilters] = useState<Filters>(() => pickInitialFilters())

  // Re-cliquer la tranche active la désélectionne (retour à "toutes").
  const setSlot            = useCallback((v: SlotId | null) => setFilters(f => ({ ...f, slot: f.slot === v ? null : v })), [])
  const setGenres          = useCallback((v: Genre[])  => setFilters(f => ({ ...f, genres: v })),          [])
  const setArrondissements = useCallback((v: number[]) => setFilters(f => ({ ...f, arrondissements: v })), [])

  // Concerts du jour visible (21), annotés de leur tranche. Mémoïsé sur l'identité des events.
  const dayEvents = useMemo(
    () => events
      .filter(e => eventSessionDate(e) === VISIBLE_SESSION_DATE)
      .map(e => ({ event: e, slot: eventSlot(e) })),
    [events],
  )

  const matchesGenreArr = useCallback((e: Event) => {
    if (filters.genres.length > 0 && !filters.genres.some(g => e.genres.includes(g))) return false
    if (filters.arrondissements.length > 0 && !filters.arrondissements.includes(e.arrondissement ?? 0)) return false
    return true
  }, [filters.genres, filters.arrondissements])

  const filteredEvents = useMemo(
    () => dayEvents
      .filter(({ event: e, slot }) => (!filters.slot || slot === filters.slot) && matchesGenreArr(e))
      .map(a => a.event),
    [dayEvents, filters.slot, matchesGenreArr],
  )

  // Compteurs par tranche (affichés sur les boutons) : respectent genre/arrondissement
  // mais ignorent la tranche sélectionnée — on veut toujours voir le volume de chaque créneau.
  const slotCounts = useMemo<SlotCounts>(() => {
    const counts = Object.fromEntries(SLOTS.map(s => [s.id, 0])) as SlotCounts
    for (const { event: e, slot } of dayEvents) if (matchesGenreArr(e)) counts[slot]++
    return counts
  }, [dayEvents, matchesGenreArr])

  // MapLibre filter expression — mirrors filteredEvents logic on GeoJSON properties.
  const mapFilter = useMemo<MapFilterExpr>(() => {
    const conditions: unknown[] = ['all']
    conditions.push(['==', ['get', 'session_day'], VISIBLE_SESSION_DATE])
    if (filters.slot) conditions.push(['==', ['get', 'slot'], filters.slot])
    if (filters.genres.length > 0) {
      conditions.push(['any', ...filters.genres.map(g => ['in', g, ['get', 'genres']])])
    }
    if (filters.arrondissements.length > 0) {
      conditions.push(['any', ...filters.arrondissements.map(a => ['==', ['get', 'arrondissement'], a])])
    }
    return conditions as MapFilterExpr
  }, [filters])

  // Heure de référence (statut « en cours / à venir », halo pulse) : l'heure
  // représentative de la tranche choisie, sinon 19h (cœur de soirée, carte la plus dense).
  const referenceTime = useMemo(() => {
    const refHour = SLOTS.find(s => s.id === filters.slot)?.refHour ?? 19
    const hh = String(refHour).padStart(2, '0')
    return new Date(`${VISIBLE_SESSION_DATE}T${hh}:00:00+02:00`)
  }, [filters.slot])

  return {
    filters,
    setSlot, setGenres, setArrondissements,
    mapFilter,
    filteredEvents,
    filteredCount: filteredEvents.length,
    slotCounts,
    referenceTime,
  }
}
