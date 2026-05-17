import { useState, useMemo, useCallback } from 'react'
import type { Genre, Event } from '@/types/event'
import {
  FESTIVAL_WINDOW_START,
  FESTIVAL_WINDOW_END,
  TIME_AXIS_MIN,
  TIME_AXIS_MAX,
  type SessionDate,
} from '@/lib/festival'
import { getSessionDate, toSessionAxis, axisToDate } from '@/lib/session'

export type OutdoorFilter = 'all' | 'outdoor' | 'indoor'
export type PriceFilter   = 'all' | 'free' | 'free_or_libre'
export type TimeRange     = readonly [number, number]

export interface Filters {
  sessionDate: SessionDate | null     // null = "Tout"
  timeRange:   TimeRange              // axis 14–30 (16h window across one soirée)
  genres:      Genre[]
  subgenres:   string[]
  outdoor:     OutdoorFilter
  price:       PriceFilter
}

const DEFAULT_SESSION_DATE: SessionDate = '2026-06-21'
const DEFAULT_TIME_RANGE: TimeRange = [18, 23]

/**
 * Smart default: pendant la fenêtre festival (Sam 20 14h → Lun 22 06h Europe/Paris),
 * ancre `timeRange[0]` sur l'heure courante et la session correspondante.
 * Hors fenêtre, on garde le défaut (Dim 21, 18h–23h).
 */
function pickInitialFilters(now: Date): Filters {
  const base: Filters = {
    sessionDate: DEFAULT_SESSION_DATE,
    timeRange:   DEFAULT_TIME_RANGE,
    genres:      [],
    subgenres:   [],
    outdoor:     'all',
    price:       'all',
  }
  if (now < FESTIVAL_WINDOW_START || now > FESTIVAL_WINDOW_END) return base

  const sd = getSessionDate(now.toISOString())
  if (sd !== '2026-06-20' && sd !== '2026-06-21') return base

  const axis = toSessionAxis(now.toISOString(), sd)
  const lower = Math.max(TIME_AXIS_MIN, Math.min(TIME_AXIS_MAX - 1, Math.floor(axis)))
  const upper = Math.min(TIME_AXIS_MAX, Math.max(lower + 3, DEFAULT_TIME_RANGE[1]))
  return { ...base, sessionDate: sd, timeRange: [lower, upper] }
}

interface MapFilterExpr extends Array<unknown> { 0: string }

export function useFilters(events: Event[], now: Date = new Date()) {
  const [filters, setFilters] = useState<Filters>(() => pickInitialFilters(now))

  const setSessionDate = useCallback((v: SessionDate | null) => setFilters(f => ({ ...f, sessionDate: v })), [])
  const setTimeRange   = useCallback((v: TimeRange)          => setFilters(f => ({ ...f, timeRange: v })),   [])
  const setGenres      = useCallback((v: Genre[])            => setFilters(f => ({ ...f, genres: v })),      [])
  const setSubgenres   = useCallback((v: string[])           => setFilters(f => ({ ...f, subgenres: v })),   [])
  const setOutdoor     = useCallback((v: OutdoorFilter)      => setFilters(f => ({ ...f, outdoor: v })),     [])
  const setPrice       = useCallback((v: PriceFilter)        => setFilters(f => ({ ...f, price: v })),       [])

  // Annotate each event with its session_date + axis bounds (memoised on events identity).
  const annotated = useMemo(() => events.map(e => {
    const session_date = e.session_date ?? getSessionDate(e.start_time)
    return {
      event:       e,
      session_date,
      start_axis:  toSessionAxis(e.start_time, session_date),
      end_axis:    toSessionAxis(e.end_time,   session_date),
    }
  }), [events])

  const filteredEvents = useMemo(() => {
    const [lo, hi] = filters.timeRange
    return annotated.filter(({ event: e, session_date, start_axis, end_axis }) => {
      if (filters.sessionDate !== null && session_date !== filters.sessionDate) return false
      // Axis overlap: [start_axis, end_axis] intersects [lo, hi]
      if (end_axis < lo || start_axis > hi) return false
      if (filters.genres.length    > 0 && !filters.genres.some(g => e.genres.includes(g)))         return false
      if (filters.subgenres.length > 0 && !filters.subgenres.some(sg => e.subgenres.includes(sg))) return false
      if (filters.outdoor === 'outdoor' && e.is_outdoor !== true)  return false
      if (filters.outdoor === 'indoor'  && e.is_outdoor !== false) return false
      if (filters.price   === 'free'         && e.price_type !== 'free') return false
      if (filters.price   === 'free_or_libre' && !['free', 'prix_libre'].includes(e.price_type)) return false
      return true
    }).map(a => a.event)
  }, [annotated, filters])

  // MapLibre filter expression — mirrors filteredEvents logic on GeoJSON properties.
  const mapFilter = useMemo<MapFilterExpr>(() => {
    const conditions: unknown[] = ['all']
    if (filters.sessionDate !== null) {
      conditions.push(['==', ['get', 'session_date'], filters.sessionDate])
    }
    conditions.push(['>=', ['get', 'end_axis'],   filters.timeRange[0]])
    conditions.push(['<=', ['get', 'start_axis'], filters.timeRange[1]])

    if (filters.genres.length > 0) {
      conditions.push(['any', ...filters.genres.map(g => ['in', g, ['get', 'genres']])])
    }
    if (filters.subgenres.length > 0) {
      conditions.push(['any', ...filters.subgenres.map(sg => ['in', sg, ['get', 'subgenres']])])
    }
    if (filters.outdoor === 'outdoor') conditions.push(['==', ['get', 'is_outdoor'], 1])
    if (filters.outdoor === 'indoor')  conditions.push(['==', ['get', 'is_outdoor'], 0])
    if (filters.price === 'free') {
      conditions.push(['==', ['get', 'price_type'], 'free'])
    } else if (filters.price === 'free_or_libre') {
      conditions.push(['in', ['get', 'price_type'], ['literal', ['free', 'prix_libre']]])
    }
    return conditions as MapFilterExpr
  }, [filters])

  // Reference date anchoring "now" for the event-status pill in the detail panel.
  // Use the lower bound of the active soirée; defaults to the 21st if "Tout".
  const referenceTime = useMemo(() => {
    const sd = filters.sessionDate ?? DEFAULT_SESSION_DATE
    return axisToDate(sd, filters.timeRange[0])
  }, [filters.sessionDate, filters.timeRange])

  return {
    filters,
    setSessionDate, setTimeRange, setGenres, setSubgenres, setOutdoor, setPrice,
    mapFilter,
    filteredEvents,
    filteredCount: filteredEvents.length,
    referenceTime,
  }
}
