'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { TIME_AXIS_MIN, TIME_AXIS_MAX } from '@/lib/festival'
import { formatAxisHour } from '@/lib/session'

interface Props {
  value: [number, number]
  onChange: (next: [number, number]) => void
}

const TICKS = [
  { axis: 0,  label: 'Sam 0h' },
  { axis: 12, label: 'Sam 12h' },
  { axis: 24, label: 'Dim 0h' },
  { axis: 36, label: 'Dim 12h' },
  { axis: 48, label: 'Dim 24h' },
]

const tickLeftPct = (axis: number) =>
  ((axis - TIME_AXIS_MIN) / (TIME_AXIS_MAX - TIME_AXIS_MIN)) * 100

export function TimeRangeSlider({ value, onChange }: Props) {
  const [local, setLocal] = useState<[number, number]>(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local in sync if the parent overrides the range (e.g. smart default).
  useEffect(() => { setLocal(value) }, [value])

  // Flush any pending debounce on unmount — avoids a late onChange firing post-cleanup.
  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }, [])

  const handleChange = (next: number | readonly number[]) => {
    const arr = Array.isArray(next) ? next : [next, next]
    let lo = Math.min(arr[0], arr[1])
    let hi = Math.max(arr[0], arr[1])
    // Prevent both thumbs from collapsing onto the same axis tick.
    if (hi - lo < 1) hi = Math.min(TIME_AXIS_MAX, lo + 1)
    const tuple: [number, number] = [lo, hi]
    setLocal(tuple)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(tuple), 100)
  }

  return (
    <div
      role="region"
      aria-label="Plage horaire"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 pt-2 pb-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 text-sm font-semibold tabular-nums w-[5rem]">
          <Clock className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
          {formatAxisHour(local[0])}
        </div>

        <SliderPrimitive.Root
          min={TIME_AXIS_MIN}
          max={TIME_AXIS_MAX}
          step={1}
          value={local}
          onValueChange={handleChange}
          thumbAlignment="edge"
          className="flex-1 data-horizontal:w-full"
        >
          <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none">
            <SliderPrimitive.Track
              className="relative grow overflow-hidden rounded-full h-2 w-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.30) 60%, rgba(79,70,229,0.45) 100%)',
              }}
            >
              <SliderPrimitive.Indicator
                className="absolute top-0 bottom-0 select-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgb(59,130,246), rgb(99,102,241) 60%, rgb(79,70,229))',
                }}
              />
            </SliderPrimitive.Track>
            {[0, 1].map(i => (
              <SliderPrimitive.Thumb
                key={i}
                className={
                  'relative block size-6 shrink-0 rounded-full border-2 border-indigo-600 bg-white shadow-md ' +
                  'after:absolute after:-inset-3 cursor-grab active:cursor-grabbing ' +
                  'ring-indigo-300/60 focus-visible:ring-4 focus-visible:outline-hidden hover:ring-4 active:ring-4 ' +
                  'transition-shadow'
                }
              />
            ))}
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>

        <div className="shrink-0 text-sm font-semibold tabular-nums w-[4.5rem] text-right">
          {formatAxisHour(local[1])}
        </div>
      </div>

      <div className="relative h-3 mt-1 mx-[5rem]">
        {TICKS.map(t => (
          <span
            key={t.label}
            className="absolute -translate-x-1/2 text-[10px] text-muted-foreground select-none"
            style={{ left: `${tickLeftPct(t.axis)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}
