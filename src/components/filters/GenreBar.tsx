'use client'

import { GENRE_CONFIG, ALL_GENRES } from '@/data/genres'
import type { Genre } from '@/types/event'

interface Props {
  selected: Genre[]
  onChange: (genres: Genre[]) => void
}

const CHIP_BASE =
  'shrink-0 h-8 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-full border shadow-sm ' +
  'whitespace-nowrap transition-colors backdrop-blur'

export function GenreBar({ selected, onChange }: Props) {
  const toggle = (g: Genre) =>
    selected.includes(g) ? onChange(selected.filter(x => x !== g)) : onChange([...selected, g])

  return (
    <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/80 to-transparent pt-2 pb-4">
      <div className="flex gap-1.5 overflow-x-auto px-3 scrollbar-none">
        {/* "Tous" = efface la sélection */}
        <button
          type="button"
          onClick={() => onChange([])}
          aria-pressed={selected.length === 0}
          className={
            CHIP_BASE +
            (selected.length === 0
              ? ' bg-foreground text-background border-foreground'
              : ' bg-background/95 text-foreground border-border')
          }
        >
          Tous
        </button>

        {ALL_GENRES.map(genre => {
          const { label, color, icon } = GENRE_CONFIG[genre]
          const on = selected.includes(genre)
          return (
            <button
              key={genre}
              type="button"
              onClick={() => toggle(genre)}
              aria-pressed={on}
              aria-label={label}
              className={CHIP_BASE + (on ? ' border-transparent text-white' : ' bg-background/95 text-foreground border-border')}
              style={on ? { backgroundColor: color, borderColor: color } : {}}
            >
              <span aria-hidden>{icon}</span> {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
