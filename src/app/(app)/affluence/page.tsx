'use client'

// Écran « Affluence » (remplace l'ancien Deck /decouvrir) — heatmap façon carte météo
// de l'affluence ESTIMÉE, dérivée de la notoriété des artistes (champ popularity).
// Dynamique : suit le scrubber horaire (matin → nuit), réutilise useFilters comme la carte.

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapRef } from 'react-map-gl/maplibre'
import { EventPanel } from '@/components/EventPanel'
import { EventSheet } from '@/components/EventSheet'
import { useEvents } from '@/hooks/useEvents'
import { useFilters } from '@/hooks/useFilters'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/contexts/LanguageContext'
import { SLOTS } from '@/lib/slots'
import type { Event } from '@/types/event'

const AffluenceMap = dynamic(() => import('@/components/AffluenceMap').then(m => m.AffluenceMap), {
  ssr: false,
})

const DEFAULT_SLOT_INDEX = SLOTS.findIndex(s => s.id === 'soiree')

// Échelle de couleurs de la légende (miroir du dégradé heatmap d'AffluenceMap).
const LEGEND_GRADIENT = 'linear-gradient(90deg, #1d2f8f, #1e90ff, #00e5cc, #4ade80, #fde047, #fb923c, #ff2d55)'

export default function AffluencePage() {
  const { events } = useEvents()
  const mapRef = useRef<MapRef | null>(null)
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const { filters, setSlot, mapFilter, filteredCount, slotCounts, referenceTime } = useFilters(events)

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
      {events.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
          {t.affLoading}
        </div>
      ) : (
        <AffluenceMap events={events} mapFilter={mapFilter} mapRef={mapRef} onEventClick={setSelectedEvent} />
      )}

      {/* ── Haut : titre + explainer honnêteté ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="pointer-events-auto rounded-2xl border border-white/10 px-4 py-3 backdrop-blur-xl"
          style={{ background: 'rgba(20,16,32,.78)' }}>
          <div className="font-display text-[19px] font-extrabold tracking-tight">{t.affTitle}</div>
          <div className="mt-0.5 text-[12.5px] font-semibold" style={{ color: 'var(--sun)' }}>{t.affSubtitle}</div>
          <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--muted)' }}>{t.affExplainer}</p>
        </div>
      </div>

      {/* ── Bas : légende météo + scrubber temporel ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-3"
        style={{ background: 'linear-gradient(to top, #0B0913 58%, rgba(11,9,19,.92) 85%, transparent)' }}>
        {/* Légende */}
        <div className="pointer-events-auto px-4 pb-3 pt-2">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted)' }}>
            <span>{t.affLegendLow}</span>
            <span>{t.affLegendHigh}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: LEGEND_GRADIENT }} />
        </div>

        {/* Scrubber temporel (identique à la carte) */}
        <div className="pointer-events-auto px-4 pb-1 pt-1">
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
              aria-label={t.affTitle}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              style={{ zIndex: 3 }}
            />
          </div>
        </div>
      </div>

      {/* Fiche concert (clic sur un point) — réutilise les composants de la carte */}
      <EventPanel event={selectedEvent} sliderTime={referenceTime} onClose={() => setSelectedEvent(null)} />
      <EventSheet event={isMobile ? selectedEvent : null} sliderTime={referenceTime} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
