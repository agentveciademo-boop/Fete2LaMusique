'use client'

import { SLOTS, type SlotId } from '@/lib/slots'

interface Props {
  selected: SlotId | null
  counts: Record<SlotId, number>
  onChange: (slot: SlotId | null) => void
}

const CHIP =
  'shrink-0 h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-full border ' +
  'whitespace-nowrap transition-colors tabular-nums'

const chipClass = (on: boolean) =>
  CHIP + (on
    ? ' bg-foreground text-background border-foreground'
    : ' bg-background text-foreground border-border hover:bg-muted')

export function SlotFilter({ selected, counts, onChange }: Props) {
  const total = SLOTS.reduce((n, s) => n + (counts[s.id] ?? 0), 0)

  return (
    <div
      role="region"
      aria-label="Tranche horaire"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={selected === null}
          className={chipClass(selected === null)}
        >
          Toutes <span className="opacity-60">{total}</span>
        </button>
        {SLOTS.map(s => {
          const on = selected === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={on}
              aria-label={`${s.label} (${counts[s.id] ?? 0} concerts)`}
              className={chipClass(on)}
            >
              <span aria-hidden>{s.emoji}</span> {s.label}
              <span className={on ? 'opacity-80' : 'opacity-60'}>{counts[s.id] ?? 0}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
