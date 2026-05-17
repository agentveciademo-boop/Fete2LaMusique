'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { GENRE_CONFIG, ALL_GENRES } from '@/data/genres'
import type { Genre } from '@/types/event'

interface Props {
  selected: Genre[]
  onChange: (genres: Genre[]) => void
}

export function GenreFilter({ selected, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Genre</span>
      <ToggleGroup
        multiple
        value={selected}
        onValueChange={v => onChange(v as Genre[])}
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-none"
      >
        {ALL_GENRES.map(genre => {
          const { label, color, icon } = GENRE_CONFIG[genre]
          const isSelected = selected.includes(genre)
          return (
            <ToggleGroupItem
              key={genre}
              value={genre}
              aria-label={label}
              className="shrink-0 h-7 px-2 text-xs rounded-full border transition-colors"
              style={isSelected ? { backgroundColor: color, borderColor: color, color: '#fff' } : {}}
            >
              {icon} {label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
