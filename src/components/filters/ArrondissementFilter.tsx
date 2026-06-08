'use client'

import { useState } from 'react'

interface Props {
  selected: number[]              // 1–20 ; 0 = hors Paris ("Autre"). Vide = tous.
  onChange: (arr: number[]) => void
}

const ALL_ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1)

// Corail = couleur des contours d'arrondissement sur la carte (arrOutlineLayer) → cohérent.
const ACCENT = '#FF6B6B'

export function ArrondissementFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const toggle = (a: number) =>
    selected.includes(a) ? onChange(selected.filter(x => x !== a)) : onChange([...selected, a])

  const count = selected.length

  const cellClass = (on: boolean) =>
    'h-8 rounded-md border text-xs font-medium transition-colors ' +
    (on ? 'text-white' : 'bg-background text-foreground border-border hover:bg-muted')

  return (
    <div className="absolute top-24 right-3 z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-pressed={count > 0}
        className={
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition ' +
          (count > 0
            ? 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
            : 'border-border bg-background/95 text-foreground hover:bg-background')
        }
      >
        🏛️ Arrondissement{count > 0 ? ` · ${count}` : ''}
      </button>

      {open && (
        <div className="w-[230px] rounded-xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Arrondissement</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Tous
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {ALL_ARRONDISSEMENTS.map(a => {
              const on = selected.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(a)}
                  aria-pressed={on}
                  aria-label={`${a}e arrondissement`}
                  className={cellClass(on)}
                  style={on ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}
                >
                  {a}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => toggle(0)}
              aria-pressed={selected.includes(0)}
              aria-label="Hors Paris"
              className={'col-span-2 ' + cellClass(selected.includes(0))}
              style={selected.includes(0) ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}
            >
              Autre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
