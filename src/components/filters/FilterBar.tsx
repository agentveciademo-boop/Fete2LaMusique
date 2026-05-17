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

export function FilterBar(props: Props) {
  const { sliderMinutes, sliderTime, filters, filteredCount,
          onSliderChange, onSliderReset, onGenres, onOutdoor, onPrice } = props
  return (
    <div className="hidden md:flex items-center gap-4 px-4 h-14 bg-white/70 dark:bg-black/70 backdrop-blur border-b border-white/20 overflow-x-auto">
      <TimeFilter
        sliderMinutes={sliderMinutes}
        sliderTime={sliderTime}
        onChange={onSliderChange}
        onReset={onSliderReset}
      />
      <div className="w-px h-8 bg-border shrink-0" />
      <GenreFilter   selected={filters.genres}  onChange={onGenres} />
      <div className="w-px h-8 bg-border shrink-0" />
      <OutdoorFilter value={filters.outdoor}    onChange={onOutdoor} />
      <div className="w-px h-8 bg-border shrink-0" />
      <PriceFilter   value={filters.price}      onChange={onPrice} />
      <div className="ml-auto shrink-0">
        <ResultCount count={filteredCount} />
      </div>
    </div>
  )
}
