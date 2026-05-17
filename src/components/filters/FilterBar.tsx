'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterSheet } from './FilterSheet'
import { ResultCount } from './ResultCount'
import type { Filters, OutdoorFilter as OT, PriceFilter as PT } from '@/hooks/useFilters'
import type { Event, Genre } from '@/types/event'

interface Props {
  filters: Filters
  filteredEvents: Event[]
  filteredCount: number
  onGenres:    (g: Genre[]) => void
  onSubgenres: (s: string[]) => void
  onOutdoor:   (v: OT) => void
  onPrice:     (v: PT) => void
}

export function FilterBar(props: Props) {
  const { filters, filteredEvents, filteredCount, onGenres, onSubgenres, onOutdoor, onPrice } = props
  const [open, setOpen] = useState(false)

  const activeCount =
    filters.genres.length +
    filters.subgenres.length +
    (filters.outdoor !== 'all' ? 1 : 0) +
    (filters.price   !== 'all' ? 1 : 0)

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border shadow-md text-sm">
          <ResultCount count={filteredCount} />
          <span className="w-px h-4 bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-6 px-2 gap-1.5 text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres
            {activeCount > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-semibold">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        filters={filters}
        filteredEvents={filteredEvents}
        filteredCount={filteredCount}
        onGenres={onGenres}
        onSubgenres={onSubgenres}
        onOutdoor={onOutdoor}
        onPrice={onPrice}
      />
    </>
  )
}
