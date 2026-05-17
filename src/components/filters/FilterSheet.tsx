'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { GenreFilter }    from './GenreFilter'
import { SubgenreFilter } from './SubgenreFilter'
import { OutdoorFilter }  from './OutdoorFilter'
import { PriceFilter }    from './PriceFilter'
import { ResultCount }    from './ResultCount'
import type { Filters, OutdoorFilter as OT, PriceFilter as PT } from '@/hooks/useFilters'
import type { Event, Genre } from '@/types/event'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: Filters
  filteredEvents: Event[]
  filteredCount: number
  onGenres:    (g: Genre[]) => void
  onSubgenres: (s: string[]) => void
  onOutdoor:   (v: OT) => void
  onPrice:     (v: PT) => void
}

export function FilterSheet({
  open, onOpenChange,
  filters, filteredEvents, filteredCount,
  onGenres, onSubgenres, onOutdoor, onPrice,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-2">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
          </SheetTitle>
          <ResultCount count={filteredCount} />
        </SheetHeader>
        <div className="flex flex-col gap-5 py-2 pb-8">
          <GenreFilter    selected={filters.genres}    onChange={onGenres} />
          <SubgenreFilter selected={filters.subgenres} onChange={onSubgenres} events={filteredEvents} />
          <OutdoorFilter  value={filters.outdoor}      onChange={onOutdoor} />
          <PriceFilter    value={filters.price}        onChange={onPrice} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
