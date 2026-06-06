'use client'

// Écran 04 · Radar près de moi — mode live dans la rue : ce qui démarre bientôt autour de toi,
// trié par urgence. Anneaux 5/15 min à pied, blips par direction/distance, balayage animé.
// Réf. design : VarRadar (variations-b.jsx).

import { useMemo } from 'react'
import { MapPin, Footprints } from 'lucide-react'
import { useDayEvents } from '@/hooks/useEvents'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useReferenceNow } from '@/hooks/useReferenceNow'
import { GenreDot } from '@/components/GenreDot'
import { primaryGenre, genreColor, minutesUntilStart } from '@/lib/view'
import { haversineMeters, bearingDegrees, walkMinutes, type LatLng } from '@/lib/geo'
import type { Event } from '@/types/event'

const R = 150            // rayon px de l'anneau extérieur (= 15 min à pied)
const MAX_WALK_MIN = 15  // l'anneau extérieur

// Repli preview : Place de la République (le quartier des mocks) si la géoloc n'est pas active.
const FALLBACK: LatLng = { lat: 48.8675, lng: 2.3636 }

export default function AutourPage() {
  const { dayEvents } = useDayEvents()
  const userLocation = useUserLocation()
  const now = useReferenceNow()

  const origin = userLocation.location ?? FALLBACK
  const approx = !userLocation.location

  // Concerts pas encore terminés, avec distance/marche/relèvement depuis l'origine.
  const around = useMemo(() => {
    return dayEvents
      .filter(e => new Date(e.end_time).getTime() > now.getTime())
      .map(e => {
        const meters = haversineMeters(origin, { lat: e.lat, lng: e.lng })
        return {
          event: e,
          meters,
          walk: walkMinutes(meters),
          bearing: bearingDegrees(origin, { lat: e.lat, lng: e.lng }),
          inmin: minutesUntilStart(e, now),
        }
      })
      .sort((a, b) => a.meters - b.meters)
  }, [dayEvents, origin, now])

  const blips = around.slice(0, 12)
  // « Ça commence bientôt » : à venir (ou tout juste), les plus imminents d'abord.
  const near = around
    .filter(a => a.inmin > -10)
    .sort((a, b) => a.inmin - b.inmin)
    .slice(0, 4)

  return (
    <div className="flex h-full flex-col" style={{ background: '#08060F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-1.5 pt-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div>
          <div className="font-display text-2xl font-extrabold leading-none tracking-tight">Près de toi</div>
          <button onClick={userLocation.locate} className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-wide" style={{ color: 'var(--muted)' }}>
            <MapPin size={13} /> {approx ? 'Activer ma position' : 'Position activée'}
          </button>
        </div>
        <div className="flex h-8 items-center gap-1.5 rounded-[20px] border px-3 text-xs font-bold"
          style={{ background: 'rgba(255,92,122,.14)', borderColor: 'rgba(255,92,138,.4)', color: 'var(--glow)' }}>
          <span className="fm-blink h-[7px] w-[7px] rounded-full" style={{ background: 'var(--glow)' }} />
          {near.length} bientôt
        </div>
      </div>

      {/* Radar */}
      <div className="relative grid h-[330px] place-items-center">
        {[1, 0.66, 0.33].map((k, i) => (
          <div key={i} className="absolute rounded-full border border-white/10" style={{ width: 2 * R * k, height: 2 * R * k }} />
        ))}
        <div className="fm-sweep absolute rounded-full" style={{ width: 2 * R, height: 2 * R, background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,92,122,.18) 50deg, transparent 60deg)' }} />
        <span className="absolute font-mono text-[8.5px]" style={{ top: `calc(50% - ${R * 0.33}px - 8px)`, color: 'var(--muted)' }}>5 min</span>
        <span className="absolute font-mono text-[8.5px]" style={{ top: `calc(50% - ${R}px - 8px)`, color: 'var(--muted)' }}>15 min à pied</span>

        {blips.map(b => {
          const ratio = Math.min(1, Math.max(0.08, b.walk / MAX_WALK_MIN))
          const rad = (b.bearing - 90) * Math.PI / 180 // 0° = nord → vers le haut
          const x = Math.cos(rad) * R * ratio
          const y = Math.sin(rad) * R * ratio
          const c = genreColor(primaryGenre(b.event))
          return (
            <span key={b.event.id} className="absolute h-[13px] w-[13px] rounded-full border-2 border-white/85"
              style={{ transform: `translate(${x}px, ${y}px)`, background: c, boxShadow: `0 0 14px ${c}` }} />
          )
        })}

        {/* toi */}
        <div className="absolute z-[2] h-[18px] w-[18px] rounded-full" style={{ background: 'var(--paper)', border: '3px solid var(--azur)', boxShadow: '0 0 18px var(--azur)' }} />
      </div>

      {/* Liste « ça commence bientôt » */}
      <div className="fm-no-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-1">
        <div className="px-1 font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>ÇA COMMENCE BIENTÔT</div>
        {near.length === 0 && <div className="px-1 text-sm" style={{ color: 'var(--muted)' }}>Rien d'imminent juste autour.</div>}
        {near.map((a, i) => <NearRow key={a.event.id} event={a.event} inmin={Math.max(0, a.inmin)} walk={a.walk} highlight={i === 0} />)}
      </div>
    </div>
  )
}

function NearRow({ event, inmin, walk, highlight }: { event: Event; inmin: number; walk: number; highlight: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border px-3.5 py-3"
      style={{ background: highlight ? 'rgba(255,92,122,.1)' : 'var(--ink-700)', borderColor: highlight ? 'rgba(255,92,138,.35)' : 'rgba(255,255,255,.08)' }}>
      <div className="w-[46px] flex-none text-center">
        <div className="font-display text-lg font-extrabold leading-none" style={{ color: highlight ? 'var(--glow)' : 'var(--paper)' }}>{inmin}&apos;</div>
        <div className="font-mono text-[8px] tracking-wider" style={{ color: 'var(--muted)' }}>DÉBUT</div>
      </div>
      <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,.1)' }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <GenreDot g={primaryGenre(event)} size={7} />
          <span className="truncate text-sm font-bold">{event.title}</span>
        </div>
        <div className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--muted)' }}>{event.venue_name}</div>
      </div>
      <div className="flex flex-none items-center gap-1 font-mono text-xs" style={{ color: 'var(--azur)' }}>
        <Footprints size={14} />{walk}&apos;
      </div>
    </div>
  )
}
