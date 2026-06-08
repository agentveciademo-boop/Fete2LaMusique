'use client'

// Écran 01 · Carte nuit — map-first, pins glow multi-genres, scrubber temporel, peek sheet.
// Évolution directe de l'ancienne /carte : même moteur (MapView + useFilters), nouvelle peau
// « encre + solstice ». Réf. design : VarMap (variations-a.jsx).

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Search, Globe, ChevronUp, X } from 'lucide-react'
import type { MapRef } from 'react-map-gl/maplibre'
import { EventPanel } from '@/components/EventPanel'
import { EventSheet } from '@/components/EventSheet'
import { UserLocation } from '@/components/UserLocation'
import { GenreDot } from '@/components/GenreDot'
import { useFilters } from '@/hooks/useFilters'
import { useEvents } from '@/hooks/useEvents'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/i18n'
import { ALL_GENRES, GENRE_CONFIG } from '@/data/genres'
import { SLOTS } from '@/lib/slots'
import { primaryGenre, genreColor, walkFrom } from '@/lib/view'
import { formatClock } from '@/lib/time'
import type { Event, Genre } from '@/types/event'

const MapView = dynamic(() => import('@/components/Map').then(m => m.MapView), { ssr: false })

const DEFAULT_SLOT_INDEX = SLOTS.findIndex(s => s.id === 'soiree')

const LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
]

export default function CartePage() {
  const { events } = useEvents()
  const mapRef = useRef<MapRef | null>(null)
  const { lang, setLang, t } = useTranslation()

  const {
    filters, setSlot, setGenres, setArrondissements,
    mapFilter, filteredEvents, filteredCount, slotCounts, referenceTime,
  } = useFilters(events)

  const userLocation = useUserLocation()
  const isMobile = useIsMobile()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [query, setQuery] = useState('')
  const [peekOpen, setPeekOpen] = useState(true)
  const [langOpen, setLangOpen] = useState(false)

  // Ouvrir le picker au premier chargement si aucune langue n'a encore été choisie.
  useEffect(() => {
    if (!localStorage.getItem('fm_lang')) setLangOpen(true)
  }, [])

  const shownEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return filteredEvents
    return filteredEvents.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.venue_name.toLowerCase().includes(q) ||
      e.genres.some(g => (t.genres[g] ?? g).toLowerCase().includes(q)),
    )
  }, [filteredEvents, query, t])

  const toggleGenre = (g: Genre) =>
    filters.genres.includes(g)
      ? setGenres(filters.genres.filter(x => x !== g))
      : setGenres([...filters.genres, g])

  const activeIdx = filters.slot ? SLOTS.findIndex(s => s.id === filters.slot) : DEFAULT_SLOT_INDEX
  const pct = (activeIdx / (SLOTS.length - 1)) * 100
  const activeSlot = SLOTS[activeIdx]
  const slotName = t.slots[activeSlot.id] ?? activeSlot.label
  const scrubLabel = filters.slot
    ? `${activeSlot.emoji} ${slotName} · ${slotCounts[activeSlot.id]} ${t.concerts}`
    : `${t.allEvening} · ${filteredCount} ${t.concerts}`

  const firstSlotName = t.slots[SLOTS[0].id] ?? SLOTS[0].label
  const lastSlotName  = t.slots[SLOTS[SLOTS.length - 1].id] ?? SLOTS[SLOTS.length - 1].label

  return (
    <div className="absolute inset-0">
      <MapView
        events={shownEvents}
        mapFilter={mapFilter}
        sliderTime={referenceTime}
        onEventClick={setSelectedEvent}
        mapRef={mapRef}
        selectedArr={filters.arrondissements}
      />

      {/* Backdrop pour fermer le sélecteur de langue */}
      {langOpen && (
        <div className="fixed inset-0 z-[1]" onClick={() => setLangOpen(false)} />
      )}

      {/* ── Haut : recherche + bouton langue + rail de genres ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="flex h-11 flex-1 items-center gap-2.5 rounded-[14px] border border-white/10 px-3.5 backdrop-blur-xl"
            style={{ background: 'rgba(20,16,32,.78)' }}>
            <Search size={17} style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
              style={{ color: 'var(--paper)' }}
            />
            {query && (
              <button type="button" aria-label="Effacer" onClick={() => setQuery('')} style={{ color: 'var(--muted)' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Bouton langue */}
          <div className="relative">
            <button
              type="button"
              aria-label={t.langPickerTitle}
              onClick={() => setLangOpen(o => !o)}
              className="grid h-11 w-11 place-items-center rounded-[14px] text-[#0B0913]"
              style={{ background: 'var(--glow)', boxShadow: '0 0 20px rgba(255,92,138,.5)' }}
            >
              <Globe size={18} />
            </button>

            {langOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl border border-white/10 p-1.5 shadow-2xl backdrop-blur-xl"
                style={{ background: 'rgba(20,16,32,.96)', minWidth: '160px' }}
              >
                {LANG_OPTIONS.map(({ code, flag, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setLang(code); setLangOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                    style={lang === code
                      ? { background: 'var(--glow)', color: '#0B0913' }
                      : { color: 'var(--paper)' }
                    }
                  >
                    <span className="text-base">{flag}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rail de genres (scroll horizontal) */}
        <div className="fm-no-scrollbar pointer-events-auto mt-2.5 flex gap-2 overflow-x-auto pb-1">
          <Chip on={filters.genres.length === 0} onClick={() => setGenres([])} label={t.genreAll} />
          {ALL_GENRES.map(g => (
            <Chip
              key={g}
              g={g}
              on={filters.genres.includes(g)}
              onClick={() => toggleGenre(g)}
              label={t.genres[g] ?? GENRE_CONFIG[g].label}
            />
          ))}
        </div>
      </div>

      {/* Bouton géolocalisation */}
      <UserLocation
        location={userLocation.location}
        error={userLocation.error}
        loading={userLocation.loading}
        mapRef={mapRef}
        onLocate={userLocation.locate}
      />

      {/* Empty state */}
      {shownEvents.length === 0 && (filters.slot !== null || filters.genres.length > 0 || query.trim() !== '') && (
        <div className="pointer-events-auto absolute left-1/2 top-[150px] z-10 max-w-[88vw] -translate-x-1/2 rounded-full border border-white/10 px-4 py-2 text-center text-sm backdrop-blur-xl"
          style={{ background: 'rgba(20,16,32,.9)', color: 'var(--paper)' }}>
          {t.noConcerts}{' '}
          <button onClick={() => { setSlot(null); setGenres([]); setQuery('') }} className="font-semibold underline underline-offset-2" style={{ color: 'var(--glow)' }}>
            {t.clear}
          </button>
        </div>
      )}

      {/* ── Bas : scrubber temporel + peek sheet ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-3"
        style={{ background: 'linear-gradient(to top, #0B0913 58%, rgba(11,9,19,.92) 85%, transparent)' }}>
        {/* Scrubber */}
        <div className="pointer-events-auto px-4 pb-3 pt-2">
          <div className="mb-1.5 flex justify-between font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted)' }}>
            <span>{firstSlotName}</span>
            <span style={{ color: 'var(--sun)' }}>● {scrubLabel}</span>
            <span>{lastSlotName}</span>
          </div>
          <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.1)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--azur), var(--glow) 60%, var(--sun))' }} />
            {SLOTS.map((s, i) => {
              const p = (i / (SLOTS.length - 1)) * 100
              return (
                <div key={s.id} className="absolute top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${p}%`, background: i < activeIdx ? 'rgba(255,255,255,.6)' : i === activeIdx ? 'var(--glow)' : 'rgba(255,255,255,.2)', zIndex: 1 }} />
              )
            })}
            <div className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${pct}%`, background: 'var(--paper)', border: '3px solid var(--glow)', boxShadow: '0 0 14px var(--glow)', zIndex: 2 }} />
            <input
              type="range" min={0} max={SLOTS.length - 1} step={1} value={activeIdx}
              onChange={e => setSlot(SLOTS[Number(e.target.value)].id)}
              aria-label={t.langPickerTitle}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              style={{ zIndex: 3 }}
            />
          </div>
        </div>

        {/* Peek sheet */}
        <div className="pointer-events-auto flex items-center justify-between px-5">
          <div className="font-display text-[17px] font-extrabold tracking-tight">
            {userLocation.location ? t.nearYou : t.onStage}
            <span className="ml-2 font-mono text-[11px] font-normal" style={{ color: 'var(--muted)' }}>{shownEvents.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setPeekOpen(o => !o)}
            aria-expanded={peekOpen}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            {peekOpen ? t.collapse : t.list}
            <ChevronUp size={14} className="transition-transform" style={{ transform: peekOpen ? 'none' : 'rotate(180deg)' }} />
          </button>
        </div>
        {peekOpen && (
          <div className="fm-no-scrollbar pointer-events-auto mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {shownEvents.slice(0, 12).map(ev => {
              const g = primaryGenre(ev)
              const walk = walkFrom(userLocation.location, ev)
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-[210px] shrink-0 overflow-hidden rounded-2xl border border-white/10 text-left"
                  style={{ background: 'var(--ink-700)' }}
                >
                  <div className="relative h-[70px]" style={{ background: `linear-gradient(135deg, ${genreColor(g)}55, var(--ink-600) 75%)` }}>
                    {ev.image_url && (
                      <img src={ev.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    {ev.requires_booking && (
                      <span className="absolute left-2 top-2 z-[1] rounded-[10px] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#0B0913]" style={{ background: 'var(--sun)' }}>
                        {t.bookingRequired}
                      </span>
                    )}
                  </div>
                  <div className="px-3 pb-3 pt-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <GenreDot g={g} size={8} />
                      <span className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--muted)' }}>
                        {formatClock(ev.start_time)}{walk ? ` · ${walk.minutes} min` : ''}
                      </span>
                    </div>
                    <div className="line-clamp-1 text-sm font-bold leading-tight">{ev.title}</div>
                    <div className="line-clamp-1 text-[11.5px]" style={{ color: 'var(--muted)' }}>{ev.venue_name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Détail (réutilise les composants existants) */}
      <EventPanel event={selectedEvent} sliderTime={referenceTime} onClose={() => setSelectedEvent(null)} />
      <EventSheet event={isMobile ? selectedEvent : null} sliderTime={referenceTime} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}

function Chip({ g, on, onClick, label }: { g?: Genre; on: boolean; onClick: () => void; label: string }) {
  const c = g ? genreColor(g) : 'var(--glow)'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-[20px] border px-3 text-[12.5px] font-semibold backdrop-blur-xl"
      style={
        on
          ? { background: c, color: '#0B0913', borderColor: c, boxShadow: `0 0 18px ${c}88` }
          : { background: 'rgba(20,16,32,.7)', color: 'var(--paper)', borderColor: 'rgba(255,255,255,.12)' }
      }
    >
      {g && !on && <GenreDot g={g} size={8} />}
      {label}
    </button>
  )
}
