'use client'

// Écran 03 · Timeline du solstice — frise verticale de 16h à l'aube, conflits côte à côte,
// ligne « MAINTENANT ». Réf. design : VarTimeline (variations-b.jsx).

import { useMemo } from 'react'
import { Sun } from 'lucide-react'
import { useDayEvents } from '@/hooks/useEvents'
import { useReferenceNow } from '@/hooks/useReferenceNow'
import { GenreDot } from '@/components/GenreDot'
import { primaryGenre, genreColor, genreLabel } from '@/lib/view'
import { parisHour } from '@/lib/session'
import type { Event } from '@/types/event'

interface Row { hour: number; label: string; items: Event[] }

export default function ProgrammePage() {
  const { dayEvents } = useDayEvents()
  const now = useReferenceNow()
  const nowHour = parisHour(now.toISOString())

  // Regroupe par heure de début (Europe/Paris), en conservant l'ordre chronologique réel
  // (un concert de 01h appartient à la session du 21 mais s'affiche après ceux de 23h).
  const rows = useMemo<Row[]>(() => {
    const map = new Map<number, Event[]>()
    for (const e of dayEvents) {
      const h = parisHour(e.start_time)
      if (!map.has(h)) map.set(h, [])
      map.get(h)!.push(e)
    }
    return Array.from(map.entries()).map(([hour, items]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      items,
    }))
  }, [dayEvents])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-5 pb-3.5 pt-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', background: 'linear-gradient(135deg, rgba(155,107,255,.16), transparent 70%)' }}>
        <div className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--sun)' }}>DIM. 21 JUIN · SOLSTICE</div>
        <div className="mt-0.5 font-display text-[26px] font-extrabold leading-none tracking-tight">La plus longue nuit de musique</div>
      </div>

      {/* Frise */}
      <div className="fm-no-scrollbar relative flex-1 overflow-y-auto px-4 pb-6">
        {/* colonne dégradée */}
        <div className="absolute bottom-2 left-[48px] top-2 w-[3px] rounded-full"
          style={{ background: 'linear-gradient(to bottom, var(--sun), var(--glow) 40%, var(--azur) 75%, #6B4DFF)' }} />

        {rows.length === 0 && <div className="pt-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Chargement du programme…</div>}

        {rows.map(r => {
          const isNow = r.hour === nowHour
          const conflict = r.items.length > 1
          return (
            <div key={r.hour} className="relative mb-3.5 flex gap-3">
              {/* label heure */}
              <div className="relative flex-[0_0_36px] pt-2 text-right">
                <span className="font-mono text-xs tracking-wide" style={{ color: isNow ? 'var(--glow)' : 'var(--muted)', fontWeight: isNow ? 700 : 500 }}>{r.label}</span>
              </div>
              {/* nœud */}
              <div className="absolute left-[42px] top-3 z-[2] h-[13px] w-[13px] rounded-full"
                style={{ background: isNow ? 'var(--glow)' : 'var(--ink-900)', border: `3px solid ${isNow ? 'var(--glow)' : 'rgba(255,255,255,.4)'}`, boxShadow: isNow ? '0 0 14px var(--glow)' : 'none' }}>
                {isNow && <span className="fm-pulse absolute -inset-[3px] rounded-full" style={{ background: 'var(--glow)' }} />}
              </div>
              {/* cartes */}
              <div className="ml-[18px] min-w-0 flex-1">
                {isNow && <div className="mb-1.5 font-mono text-[9px] tracking-widest" style={{ color: 'var(--glow)' }}>● MAINTENANT</div>}
                <div className="flex gap-2">
                  {r.items.map(e => <TimelineCard key={e.id} event={e} half={conflict} />)}
                </div>
                {conflict && <div className="mt-1.5 font-mono text-[9.5px] tracking-wide" style={{ color: 'var(--muted)' }}>{r.items.length} concerts en même temps</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer coucher de soleil */}
      <div className="px-4 pb-4 pt-2.5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3" style={{ background: 'var(--ink-700)' }}>
          <Sun size={22} style={{ color: 'var(--sun)' }} />
          <div className="flex-1">
            <div className="text-[13px] font-bold">Le soleil se couche à 21h58</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>La fête bat son plein jusqu'à l'aube</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineCard({ event, half }: { event: Event; half: boolean }) {
  const g = primaryGenre(event)
  return (
    <div className={`min-w-0 rounded-[14px] border border-white/10 px-3 py-2.5 ${half ? 'flex-1' : 'flex-auto'}`}
      style={{ background: 'var(--ink-700)', borderLeft: `3px solid ${genreColor(g)}` }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <GenreDot g={g} size={7} />
        <span className="font-mono text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{genreLabel(g)}</span>
        {event.is_outdoor && <span className="ml-auto text-[10px]">🌳</span>}
      </div>
      <div className={`mb-0.5 font-bold leading-tight ${half ? 'truncate text-[13px]' : 'text-[14.5px]'}`}>{event.title}</div>
      <div className="truncate text-[11px]" style={{ color: 'var(--muted)' }}>{event.venue_name}</div>
    </div>
  )
}
