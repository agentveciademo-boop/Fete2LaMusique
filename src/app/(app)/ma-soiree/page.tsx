'use client'

// Écran 05 · Ma soirée — itinéraire enchaîné depuis la shortlist (favoris).
// Récap (concerts · km · plage horaire) + stops numérotés reliés par segments de marche.
// Réf. design : VarSoiree (variations-b.jsx).

import { useMemo } from 'react'
import Link from 'next/link'
import { Share2, Navigation, Plus, MapPin } from 'lucide-react'
import { useDayEvents } from '@/hooks/useEvents'
import { useFavorites } from '@/hooks/useFavorites'
import { GenreDot } from '@/components/GenreDot'
import { primaryGenre, genreColor } from '@/lib/view'
import { formatClock } from '@/lib/time'
import { haversineMeters, walkMinutes, formatDistance } from '@/lib/geo'
import type { Event } from '@/types/event'

export default function MaSoireePage() {
  const { dayEvents } = useDayEvents()
  const { ids, remove } = useFavorites()

  // Parcours = favoris du jour, dans l'ordre chronologique de début.
  const stops = useMemo<Event[]>(() => {
    const byId = new Map(dayEvents.map(e => [e.id, e]))
    return ids
      .map(id => byId.get(id))
      .filter((e): e is Event => !!e)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [dayEvents, ids])

  // Segments de marche entre lieux consécutifs.
  const legs = useMemo(
    () => stops.slice(1).map((e, i) => {
      const meters = haversineMeters(stops[i], e)
      return { minutes: walkMinutes(meters), meters }
    }),
    [stops],
  )

  const totalMeters = legs.reduce((m, l) => m + l.meters, 0)
  const span = stops.length
    ? `${formatClock(stops[0].start_time)}→${formatClock(stops[stops.length - 1].end_time)}`
    : '—'

  if (stops.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl">🌃</div>
        <div className="mt-4 font-display text-2xl font-extrabold">Ta soirée est vide</div>
        <p className="mt-2 max-w-65 text-sm" style={{ color: 'var(--muted)' }}>
          Garde des concerts depuis l&apos;onglet Découvrir pour composer ton parcours.
        </p>
        <Link href="/decouvrir" className="mt-6 rounded-2xl px-5 py-3 text-sm font-bold text-[#0B0913]"
          style={{ background: 'var(--glow)', boxShadow: '0 8px 30px rgba(255,92,138,.4)' }}>
          Découvrir des concerts
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pb-3 pt-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div>
          <div className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--sun)' }}>TON PARCOURS · 21 JUIN</div>
          <div className="mt-0.5 font-display text-[26px] font-extrabold leading-none tracking-tight">Ma soirée</div>
        </div>
        <button onClick={() => shareItinerary(stops)} aria-label="Partager" className="grid h-10 w-10 place-items-center rounded-[13px] border border-white/10" style={{ background: 'var(--ink-700)' }}>
          <Share2 size={17} />
        </button>
      </div>

      {/* Récap */}
      <div className="flex gap-2 px-4 pb-3">
        <Stat value={String(stops.length)} label={stops.length > 1 ? 'concerts' : 'concert'} />
        <Stat value={formatDistance(totalMeters)} label="à pied" />
        <Stat value={span} label="durée" />
      </div>

      {/* Itinéraire */}
      <div className="fm-no-scrollbar relative flex-1 overflow-y-auto px-4 pb-4 pt-1">
        {stops.map((e, i) => {
          const g = primaryGenre(e)
          return (
            <div key={e.id}>
              <div className="flex gap-3.5">
                <div className="flex flex-none flex-col items-center">
                  <div className="grid h-[30px] w-[30px] place-items-center rounded-full font-display text-[13px] font-extrabold text-[#0B0913]"
                    style={{ background: genreColor(g), boxShadow: `0 0 14px ${genreColor(g)}88` }}>{i + 1}</div>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[13px] font-bold">{formatClock(e.start_time)}</span>
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--muted)' }}>→ {formatClock(e.end_time)}</span>
                    <GenreDot g={g} size={7} />
                    <button onClick={() => remove(e.id)} className="ml-auto text-[11px]" style={{ color: 'var(--muted)' }}>Retirer</button>
                  </div>
                  <div className="my-0.5 text-base font-bold leading-tight">{e.title}</div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                    <MapPin size={13} />{e.venue_name}
                  </div>
                </div>
              </div>
              {/* segment de marche */}
              {i < stops.length - 1 && (
                <div className="flex h-[42px] items-center gap-3.5">
                  <div className="flex flex-[0_0_30px] justify-center">
                    <div className="h-[42px] w-0.5" style={{ background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,.3) 0 4px, transparent 4px 8px)' }} />
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--azur)' }}>
                    <Navigation size={13} /> {legs[i].minutes} min de marche
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ajouter */}
        <Link href="/decouvrir" className="mt-1 flex gap-3.5">
          <div className="flex flex-[0_0_30px] justify-center">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-dashed border-white/25" style={{ color: 'var(--muted)' }}>
              <Plus size={16} />
            </div>
          </div>
          <div className="self-center text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Ajouter un concert…</div>
        </Link>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 pt-2">
        <button onClick={() => openRoute(stops)} className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-bold text-[#0B0913]"
          style={{ background: 'var(--glow)', boxShadow: '0 8px 30px rgba(255,92,138,.4)' }}>
          <Navigation size={18} /> Lancer l&apos;itinéraire
        </button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-[14px] border border-white/10 px-3 py-2.5" style={{ background: 'var(--ink-700)' }}>
      <div className="font-display text-[17px] font-extrabold leading-none" style={{ color: 'var(--glow)' }}>{value}</div>
      <div className="mt-1 font-mono text-[10px] tracking-wide" style={{ color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

// Ouvre Google Maps en mode itinéraire à pied, lieux dans l'ordre (origine = 1er stop).
function openRoute(stops: Event[]) {
  if (!stops.length) return
  const pts = stops.map(s => `${s.lat},${s.lng}`)
  const origin = pts[0]
  const destination = pts[pts.length - 1]
  const waypoints = pts.slice(1, -1).join('|')
  const url = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${destination}` +
    (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '')
  window.open(url, '_blank', 'noopener')
}

async function shareItinerary(stops: Event[]) {
  const text = `Ma soirée Fête de la Musique :\n` + stops.map((s, i) => `${i + 1}. ${formatClock(s.start_time)} ${s.title} — ${s.venue_name}`).join('\n')
  try {
    if (navigator.share) { await navigator.share({ title: 'Ma soirée', text }); return }
    await navigator.clipboard.writeText(text)
  } catch {/* annulé / non supporté */}
}
