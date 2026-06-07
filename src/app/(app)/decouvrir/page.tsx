'use client'

// Écran 02 · Le Deck — découverte par swipe, construit la shortlist (favoris).
// Swipe droite = garder (♥) · gauche = passer · bouton infos = ouvre le détail.
// Reset pour recommencer la pile ; ajout → toast « Ajouté à Ma soirée » + pop du compteur.
// Réf. design : VarDeck (variations-a.jsx).

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { X, Heart, Info, RotateCcw, Clock, Footprints, Ticket, MapPin } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { EventSheet } from '@/components/EventSheet'
import { EventPanel } from '@/components/EventPanel'
import { useDayEvents } from '@/hooks/useEvents'
import { useFavorites } from '@/hooks/useFavorites'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useReferenceNow } from '@/hooks/useReferenceNow'
import { useIsMobile } from '@/hooks/useIsMobile'
import { primaryGenre, genreColor, genreLabel, timeRange, walkFrom, priceLabel, minutesUntilStart } from '@/lib/view'
import { GENRE_CONFIG } from '@/data/genres'
import type { Event } from '@/types/event'

const SWIPE_THRESHOLD = 110

export default function DecouvrirPage() {
  const { dayEvents } = useDayEvents()
  const { has, add, count, ids } = useFavorites()
  const userLocation = useUserLocation()
  const now = useReferenceNow()
  const isMobile = useIsMobile()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Boost genres : concerts des genres les plus likés remontent en tête de pile.
  const sortedEvents = useMemo(() => {
    const likedEvents = ids.map(id => dayEvents.find(e => e.id === id)).filter(Boolean)
    if (likedEvents.length === 0) return dayEvents
    const scores = new Map<string, number>()
    for (const e of likedEvents) {
      for (const g of e!.genres) scores.set(g, (scores.get(g) ?? 0) + 1)
    }
    return [...dayEvents].sort((a, b) => {
      const sa = a.genres.reduce((n, g) => n + (scores.get(g) ?? 0), 0)
      const sb = b.genres.reduce((n, g) => n + (scores.get(g) ?? 0), 0)
      return sb - sa
    })
  }, [dayEvents, ids])

  // Pile de cartes triée par affinité genre. La carte du dessus = sortedEvents[index].
  const current = sortedEvents[index]
  const next = sortedEvents[index + 1]
  const remaining = Math.max(0, sortedEvents.length - index)

  const advance = (like: boolean) => {
    if (current && like) {
      add(current.id)
      // Feedback : confirme l'ajout à Ma soirée, avec raccourci pour y aller.
      toast.success('Ajouté à Ma soirée', {
        description: current.title,
        action: { label: 'Voir', onClick: () => router.push('/ma-soiree') },
      })
    }
    setIndex(i => i + 1)
  }

  if (sortedEvents.length === 0) {
    return <Centered>Chargement des concerts…</Centered>
  }

  if (!current) {
    return (
      <Centered>
        <div className="text-5xl">🎉</div>
        <div className="mt-4 font-display text-2xl font-extrabold">Tu as tout vu !</div>
        <p className="mt-2 max-w-[260px] text-sm" style={{ color: 'var(--muted)' }}>
          {count > 0
            ? `${count} concert${count > 1 ? 's' : ''} dans ta shortlist.`
            : "Aucun favori pour l'instant — relance pour en garder."}
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setIndex(0)} className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold"
            style={{ background: 'var(--ink-700)' }}>
            Recommencer
          </button>
          {count > 0 && (
            <Link href="/ma-soiree" className="rounded-2xl px-5 py-3 text-sm font-bold text-[#0B0913]"
              style={{ background: 'var(--glow)', boxShadow: '0 8px 30px rgba(255,92,138,.4)' }}>
              Voir ma soirée
            </Link>
          )}
        </div>
      </Centered>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-2.5 pt-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">À découvrir</div>
          <div className="font-mono text-[11px] tracking-wide" style={{ color: 'var(--muted)' }}>
            SWIPE · {remaining} RESTANT{remaining > 1 ? 'S' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Recommencer la pile"
            onClick={() => setIndex(0)}
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-white/15"
            style={{ background: 'var(--ink-700)', color: 'var(--muted)' }}
          >
            <RotateCcw size={16} />
          </button>
          {/* key={count} → remonte le chip à chaque ajout : petit « pop » de mise en lumière */}
          <motion.div
            key={count}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="flex h-[34px] items-center gap-1.5 rounded-[20px] border px-3"
            style={{ background: 'rgba(255,92,138,.14)', borderColor: 'rgba(255,92,138,.4)', color: 'var(--glow)' }}
          >
            <Heart size={15} fill="currentColor" />
            <span className="text-[13px] font-bold">{count}</span>
          </motion.div>
        </div>
      </div>

      {/* Pile de cartes */}
      <div className="relative mx-5 mt-0.5 flex-1">
        {/* cartes du fond */}
        {next && <div className="absolute inset-x-3 top-1.5 h-[90%] rounded-[26px] opacity-60" style={{ background: 'var(--ink-600)', transform: 'rotate(2deg)' }} />}
        {next && <div className="absolute inset-x-6 top-2.5 h-[88%] rounded-[26px] opacity-40" style={{ background: 'var(--ink-700)', transform: 'rotate(-3deg)' }} />}

        <AnimatePresence initial={false}>
          <SwipeCard key={current.id} event={current} now={now} location={userLocation.location} onResolve={advance} />
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-6 px-0 pb-3.5 pt-4">
        <RoundBtn aria-label="Passer" onClick={() => advance(false)} size={56} color="var(--muted)">
          <X size={24} />
        </RoundBtn>
        <RoundBtn aria-label="Garder" onClick={() => advance(true)} size={70}
          bg="var(--glow)" color="#0B0913" glow="0 0 30px rgba(255,92,138,.6)">
          <Heart size={30} strokeWidth={2.4} fill={has(current.id) ? '#0B0913' : 'none'} />
        </RoundBtn>
        <RoundBtn aria-label="Infos" onClick={() => setSelectedEvent(current)} size={56} color="var(--azur)">
          <Info size={22} />
        </RoundBtn>
      </div>

      {/* Détail du concert (réutilise les composants existants) */}
      <EventPanel event={selectedEvent} sliderTime={now} onClose={() => setSelectedEvent(null)} />
      <EventSheet event={isMobile ? selectedEvent : null} sliderTime={now} onClose={() => setSelectedEvent(null)} />
      <Toaster />
    </div>
  )
}

function SwipeCard({ event, now, location, onResolve }: {
  event: Event
  now: Date
  location: { lat: number; lng: number } | null
  onResolve: (like: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])

  const g = primaryGenre(event)
  const accent = genreColor(g)
  const walk = walkFrom(location, event)
  const startsIn = minutesUntilStart(event, now)
  const soon = startsIn > 0 && startsIn <= 30

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onResolve(true)
        else if (info.offset.x < -SWIPE_THRESHOLD) onResolve(false)
      }}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: x.get() > 0 ? 320 : -320, opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="relative h-full overflow-hidden rounded-[26px] border border-white/10"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
        {/* visuel */}
        {event.image_url
          ? <img src={event.image_url} alt="" className="h-full w-full object-cover" />
          : <div className="h-full w-full" style={{ background: `linear-gradient(150deg, ${accent}44, var(--ink-800) 70%)` }} />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #0B0913 8%, rgba(11,9,19,.5) 40%, ${accent}22 100%)` }} />

        {/* badges swipe (révélés selon le sens du drag) */}
        <motion.div style={{ opacity: likeOpacity, color: 'var(--glow)', borderColor: 'var(--glow)' }}
          className="absolute left-5 top-5 rotate-[-12deg] rounded-xl border-2 px-3 py-1 font-display text-xl font-extrabold">
          GARDÉ
        </motion.div>
        <motion.div style={{ opacity: passOpacity, color: 'var(--muted)', borderColor: 'var(--muted)' }}
          className="absolute right-5 top-5 rotate-[12deg] rounded-xl border-2 px-3 py-1 font-display text-xl font-extrabold">
          PASSÉ
        </motion.div>

        {/* tags haut */}
        <div className="absolute inset-x-4 top-4 flex justify-between">
          <div className="flex h-8 items-center gap-1.5 rounded-[20px] px-3 text-xs font-bold text-[#0B0913]" style={{ background: accent }}>
            <span>{GENRE_CONFIG[g].icon}</span> {genreLabel(g)}
          </div>
          {soon && (
            <div className="flex h-8 items-center gap-1.5 rounded-[20px] border px-3 font-mono text-[11px] tracking-wide backdrop-blur-md"
              style={{ background: 'rgba(11,9,19,.7)', borderColor: 'var(--sun)', color: 'var(--sun)' }}>
              <span className="fm-blink h-1.5 w-1.5 rounded-full" style={{ background: 'var(--sun)' }} />
              DANS {startsIn} MIN
            </div>
          )}
        </div>

        {/* infos bas */}
        <div className="absolute inset-x-5 bottom-6">
          <div className="mb-2.5 flex gap-3.5 font-mono text-xs" style={{ color: 'rgba(244,239,233,.9)' }}>
            <span className="flex items-center gap-1.5"><Clock size={14} />{timeRange(event)}</span>
            {walk && <span className="flex items-center gap-1.5"><Footprints size={14} />{walk.minutes} min</span>}
            <span className="flex items-center gap-1.5"><Ticket size={14} />{priceLabel(event)}</span>
          </div>
          <div className="mb-2 font-display text-[30px] font-extrabold leading-[1.02] tracking-tight">{event.title}</div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(244,239,233,.85)' }}>
            <MapPin size={15} />{event.venue_name}{event.arrondissement ? ` · ${event.arrondissement}ᵉ` : ''}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function RoundBtn({ children, onClick, size, bg = 'var(--ink-700)', color, glow, ...rest }: {
  children: React.ReactNode
  onClick: () => void
  size: number
  bg?: string
  color: string
  glow?: string
  'aria-label': string
}) {
  return (
    <button
      onClick={onClick}
      className="grid place-items-center rounded-full border border-white/15"
      style={{ width: size, height: size, background: bg, color, boxShadow: glow }}
      {...rest}
    >
      {children}
    </button>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center px-6 text-center">{children}</div>
}
