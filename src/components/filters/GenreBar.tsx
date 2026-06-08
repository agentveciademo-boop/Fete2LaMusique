'use client'

import { useState } from 'react'
import { GENRE_CONFIG, ALL_GENRES } from '@/data/genres'
import type { Genre } from '@/types/event'

interface Props {
  selected: Genre[]
  onChange: (genres: Genre[]) => void
}

const CHIP_BASE =
  'shrink-0 h-8 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-full border shadow-sm ' +
  'whitespace-nowrap transition-colors backdrop-blur'

const CHIP_NEUTRAL = (on: boolean) =>
  CHIP_BASE + (on ? ' bg-foreground text-background border-foreground' : ' bg-background/95 text-foreground border-border')

export function GenreBar({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const toggleGenre = (g: Genre) =>
    selected.includes(g) ? onChange(selected.filter(x => x !== g)) : onChange([...selected, g])

  const count = selected.length

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/80 to-transparent pt-2 pb-4">
      <div className="px-3">
        {/* Bouton "Filtre" — déplie/replie les styles de musique */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label="Filtrer par style de musique"
          className={'pointer-events-auto ' + CHIP_NEUTRAL(count > 0)}
        >
          {/* icône sliders */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Filtre{count > 0 ? ` · ${count}` : ''}
          {/* chevron */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className={'transition-transform ' + (open ? 'rotate-180' : '')}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Styles dépliés — chaque pastille porte sa couleur de genre */}
      {open && (
        <div className="pointer-events-auto mt-2">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/60">Style</p>
          <div className="flex gap-1.5 overflow-x-auto px-3 scrollbar-none">
            <button
              type="button"
              onClick={() => onChange([])}
              aria-pressed={selected.length === 0}
              className={CHIP_NEUTRAL(selected.length === 0)}
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
                  onClick={() => toggleGenre(genre)}
                  aria-pressed={on}
                  aria-label={label}
                  // Fond = couleur du genre en permanence ; sélection = anneau + coche.
                  className={CHIP_BASE + ' text-white' + (on ? ' ring-2 ring-foreground ring-offset-1 font-semibold' : '')}
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  {on && <span aria-hidden>✓</span>}
                  <span aria-hidden>{icon}</span> {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
