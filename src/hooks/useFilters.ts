import { useState, useMemo } from 'react'
import type { Genre, Event } from '@/types/event'

export type OutdoorFilter = 'all' | 'outdoor' | 'indoor'
export type PriceFilter  = 'all' | 'free' | 'free_or_libre'

export interface Filters {
  genres:  Genre[]
  outdoor: OutdoorFilter
  price:   PriceFilter
}

export function useFilters(events: Event[], sliderTime: Date) {
  const [filters, setFilters] = useState<Filters>({
    genres:  [],
    outdoor: 'all',
    price:   'all',
  })

  const setGenres  = (genres:  Genre[])       => setFilters(f => ({ ...f, genres }))
  const setOutdoor = (outdoor: OutdoorFilter) => setFilters(f => ({ ...f, outdoor }))
  const setPrice   = (price:   PriceFilter)   => setFilters(f => ({ ...f, price }))

  const sliderTs = sliderTime.getTime()

  const mapFilter = useMemo((): any[] => {
    const conditions: any[] = ['all']

    // Time window
    conditions.push(['<=', ['get', 'start_ts'], sliderTs])
    conditions.push(['>=', ['get', 'end_ts'],   sliderTs])

    // Genres (OR)
    if (filters.genres.length > 0) {
      conditions.push(['any', ...filters.genres.map(g => ['in', g, ['get', 'genres']])])
    }

    // Outdoor
    if (filters.outdoor === 'outdoor') conditions.push(['==', ['get', 'is_outdoor'], 1])
    if (filters.outdoor === 'indoor')  conditions.push(['==', ['get', 'is_outdoor'], 0])

    // Price
    if (filters.price === 'free') {
      conditions.push(['==', ['get', 'price_type'], 'free'])
    } else if (filters.price === 'free_or_libre') {
      conditions.push(['in', ['get', 'price_type'], ['literal', ['free', 'prix_libre']]])
    }

    return conditions
  }, [filters, sliderTs])

  // JS-side filtering (mirrors mapFilter logic) — also drives clustering input
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const startTs = new Date(e.start_time).getTime()
      const endTs   = new Date(e.end_time).getTime()
      if (startTs > sliderTs || endTs < sliderTs) return false
      if (filters.genres.length > 0 && !filters.genres.some(g => e.genres.includes(g))) return false
      if (filters.outdoor === 'outdoor' && e.is_outdoor !== true)  return false
      if (filters.outdoor === 'indoor'  && e.is_outdoor !== false) return false
      if (filters.price === 'free'         && e.price_type !== 'free') return false
      if (filters.price === 'free_or_libre' && !['free', 'prix_libre'].includes(e.price_type)) return false
      return true
    })
  }, [events, filters, sliderTs])

  const filteredCount = filteredEvents.length

  return { filters, setGenres, setOutdoor, setPrice, mapFilter, filteredEvents, filteredCount }
}
