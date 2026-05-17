'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TimeFilter }   from './TimeFilter'
import { GenreFilter }  from './GenreFilter'
import { OutdoorFilter } from './OutdoorFilter'
import { PriceFilter }  from './PriceFilter'
import { ResultCount }  from './ResultCount'
import type { Filters, OutdoorFilter as OT, PriceFilter as PT } from '@/hooks/useFilters'
import type { Genre } from '@/types/event'

interface Props {
  sliderMinutes: number
  sliderTime: Date
  filters: Filters
  filteredCount: number
  onSliderChange: (m: number) => void
  onSliderReset: () => void
  onGenres:  (g: Genre[]) => void
  onOutdoor: (v: OT) => void
  onPrice:   (v: PT) => void
}

export function FilterSheet(props: Props) {
  const { sliderMinutes, sliderTime, filters, filteredCount,
          onSliderChange, onSliderReset, onGenres, onOutdoor, onPrice } = props
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden absolute top-3 right-3 z-10">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button size="sm" onClick={() => setOpen(true)} className="rounded-full shadow-lg gap-1.5 bg-white/90 text-foreground hover:bg-white">
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
        </Button>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pb-2">
            <SheetTitle>Filtres</SheetTitle>
            <ResultCount count={filteredCount} />
          </SheetHeader>
          <div className="flex flex-col gap-5 py-2 pb-8">
            <TimeFilter
              sliderMinutes={sliderMinutes}
              sliderTime={sliderTime}
              onChange={onSliderChange}
              onReset={onSliderReset}
            />
            <GenreFilter   selected={filters.genres}  onChange={onGenres} />
            <OutdoorFilter value={filters.outdoor}    onChange={onOutdoor} />
            <PriceFilter   value={filters.price}      onChange={onPrice} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
