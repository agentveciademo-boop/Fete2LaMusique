import { useState, useMemo, useCallback } from 'react'
import type { Genre, Event } from '@/types/event'
import { TIME_AXIS_MIN, TIME_AXIS_MAX } from '@/lib/festival'
import { toWeekendAxis, weekendAxisToDate } from '@/lib/session'

export type OutdoorFilter = 'all' | 'outdoor' | 'indoor'
export type PriceFilter   = 'all' | 'free' | 'free_or_libre'
export type TimeRange     = readonly [number, number]

export interface Filters {
  timeRange:   TimeRange              // axe continu 0–48 (Sam 00h → Dim 24h)
  genres:      Genre[]
  subgenres:   string[]
  outdoor:     OutdoorFilter
  price:       PriceFilter
}

// Par défaut : tout le week-end visible (Sam 00h → Dim 24h).
const DEFAULT_TIME_RANGE: TimeRange = [TIME_AXIS_MIN, TIME_AXIS_MAX]

function pickInitialFilters(): Filters {
  return {
    timeRange: DEFAULT_TIME_RANGE,
    genres:    [],
    subgenres: [],
    outdoor:   'all',
    price:     'all',
  }
}

interface MapFilterExpr extends Array<unknown> { 0: string }

export function useFilters(events: Event[]) {
  const [filters, setFilters] = useState<Filters>(() => pickInitialFilters())

  const setTimeRange = useCallback((v: TimeRange)     => setFilters(f => ({ ...f, timeRange: v })), [])
  const setGenres    = useCallback((v: Genre[])       => setFilters(f => ({ ...f, genres: v })),    [])
  const setSubgenres = useCallback((v: string[])      => setFilters(f => ({ ...f, subgenres: v })), [])
  const setOutdoor   = useCallback((v: OutdoorFilter) => setFilters(f => ({ ...f, outdoor: v })),   [])
  const setPrice     = useCallback((v: PriceFilter)   => setFilters(f => ({ ...f, price: v })),     [])

  // Annotate each event with its absolute weekend axis bounds (memoised on events identity).
  const annotated = useMemo(() => events.map(e => ({
    event:      e,
    start_axis: toWeekendAxis(e.start_time),
    end_axis:   toWeekendAxis(e.end_time),
  })), [events])

  const filteredEvents = useMemo(() => {
    const [lo, hi] = filters.timeRange
    return annotated.filter(({ event: e, start_axis, end_axis }) => {
      // Axis overlap: [start_axis, end_axis] intersects [lo, hi]
      if (end_axis < lo || start_axis > hi) return false
      if (filters.genres.length    > 0 && !filters.genres.some(g => e.genres.includes(g)))         return false
      if (filters.subgenres.length > 0 && !filters.subgenres.some(sg => e.subgenres.includes(sg))) return false
      if (filters.outdoor === 'outdoor' && e.is_outdoor !== true)  return false
      if (filters.outdoor === 'indoor'  && e.is_outdoor !== false) return false
      if (filters.price   === 'free'          && e.price_type !== 'free') return false
      if (filters.price   === 'free_or_libre' && !['free', 'prix_libre'].includes(e.price_type)) return false
      return true
    }).map(a => a.event)
  }, [annotated, filters])

  // MapLibre filter expression — mirrors filteredEvents logic on GeoJSON properties.
  const mapFilter = useMemo<MapFilterExpr>(() => {
    const conditions: unknown[] = ['all']
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

  // Reference date anchoring "now" for the event-status pill — borne basse du slider.
  const referenceTime = useMemo(() => weekendAxisToDate(filters.timeRange[0]), [filters.timeRange])

  return {
    filters,
    setTimeRange, setGenres, setSubgenres, setOutdoor, setPrice,
    mapFilter,
    filteredEvents,
    filteredCount: filteredEvents.length,
    referenceTime,
  }
}
