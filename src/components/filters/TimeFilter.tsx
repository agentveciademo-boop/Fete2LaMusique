'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { formatSliderLabel, SLIDER_MINUTES_MAX } from '@/lib/time'

interface Props {
  sliderMinutes: number
  sliderTime: Date
  onChange: (minutes: number) => void
  onReset: () => void
}

// 19h00 tombe pile au milieu de la plage 12h → 02h (14h de fenêtre, +7h depuis SLIDER_START).
const TICKS = [
  { label: '12h', leftPct: 0 },
  { label: '19h', leftPct: 50 },
  { label: '02h', leftPct: 100 },
]

export function TimeFilter({ sliderMinutes, sliderTime, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-1 min-w-[280px] md:min-w-[360px] lg:min-w-[460px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Heure</span>
        <span className="text-sm font-semibold">À {formatSliderLabel(sliderTime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col gap-0.5">
          <Slider
            min={0}
            max={SLIDER_MINUTES_MAX}
            step={15}
            value={[Number.isFinite(sliderMinutes) ? sliderMinutes : 420]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              if (typeof next === 'number' && Number.isFinite(next)) onChange(next)
            }}
          />
          {/* Repères 12h / 19h / 02h — px-2.5 compense la demi-largeur du thumb (size-5 = 20px) */}
          <div className="relative h-3 px-2.5">
            {TICKS.map(t => (
              <span
                key={t.label}
                className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${t.leftPct}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onReset} className="text-xs px-2 h-7 shrink-0 self-start mt-0.5">
          Réinitialiser
        </Button>
      </div>
    </div>
  )
}
