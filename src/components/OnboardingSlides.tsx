'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, Clock, Radar, Navigation, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

const STORAGE_KEY = 'fdm_onboarding_v1'

interface SlideConfig {
  id: string
  color: string
  tint: string
  tab: string
  title: string
  desc: string
  Visual: () => React.ReactNode
}

// Partie statique des slides (visuals + couleurs) — les textes viennent de i18n
const SLIDE_STATICS = [
  { id: 'carte',     color: 'var(--azur)', tint: 'rgba(100,200,255,.06)',  Visual: VisualMap       },
  { id: 'affluence', color: '#ff2d55',    tint: 'rgba(255,45,85,.07)',    Visual: VisualHeat      },
  { id: 'programme', color: 'var(--sun)',  tint: 'rgba(255,205,58,.06)',   Visual: VisualTimeline  },
  { id: 'ma-soiree', color: 'var(--glow)', tint: 'rgba(255,92,138,.08)',   Visual: VisualItinerary },
] as const

export function OnboardingSlides() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function close() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const o = t.onboarding
  const slides: SlideConfig[] = SLIDE_STATICS.map((s, i) => ({ ...s, ...o.slides[i] }))
  const slide = slides[step]
  const last = step === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--ink-900)' }}>
      {!last && (
        <button
          onClick={close}
          className="absolute right-5 z-10 font-mono text-[11px] tracking-widest transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)', top: 'max(18px, env(safe-area-inset-top))' }}
        >
          {o.skip}
        </button>
      )}

      {/* zone visuelle */}
      <div className="relative flex-1 overflow-hidden" style={{ background: slide.tint }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <slide.Visual />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* zone texte + navigation */}
      <div
        className="shrink-0 px-6 pt-5"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        {/* dots */}
        <div className="mb-4 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} aria-label={`Slide ${i + 1}`}>
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === step ? 20 : 6,
                  background: i === step ? slide.color : 'rgba(255,255,255,.2)',
                }}
                style={{ height: 6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </button>
          ))}
        </div>

        {/* label onglet */}
        <div className="mb-1.5 font-mono text-[10.5px] tracking-widest" style={{ color: slide.color }}>
          {slide.tab}
        </div>

        {/* titre + description */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-2 font-display text-[24px] font-extrabold leading-[1.1] tracking-tight">
              {slide.title}
            </div>
            <p className="mb-5 text-[13.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <button
          onClick={last ? close : () => setStep(s => s + 1)}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-[#0B0913]"
          style={{ background: slide.color, boxShadow: `0 8px 28px ${slide.color}55` }}
        >
          {last ? o.start : <>{o.next} <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  )
}

// ─── Visuals ────────────────────────────────────────────────────────────────

function VisualMap() {
  const dots = [
    { x: 28, y: 38, r: 10 }, { x: 54, y: 24, r: 8 }, { x: 72, y: 48, r: 12 },
    { x: 44, y: 64, r: 9 },  { x: 21, y: 57, r: 7 }, { x: 66, y: 70, r: 11 },
    { x: 82, y: 30, r: 8 },  { x: 37, y: 20, r: 10 }, { x: 60, y: 52, r: 8 },
  ]
  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(100,200,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,255,.5) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`, top: `${d.y}%`,
            width: d.r, height: d.r,
            transform: 'translate(-50%,-50%)',
            background: 'var(--glow)',
            boxShadow: '0 0 10px var(--glow)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.07, type: 'spring', stiffness: 380 }}
        />
      ))}
      <div
        className="relative rounded-2xl border border-white/10 p-5"
        style={{ background: 'rgba(11,9,19,.82)', backdropFilter: 'blur(14px)' }}
      >
        <Map size={60} style={{ color: 'var(--azur)' }} strokeWidth={1.3} />
      </div>
    </div>
  )
}

// Aperçu « carte météo » de l'affluence : taches colorées floutées qui pulsent doucement,
// du bleu (calme) au rouge (plein à craquer). Reproduit le rendu de la heatmap.
function VisualHeat() {
  // Foyers : position, taille, couleur (du chaud au froid).
  const blobs = [
    { x: 60, y: 42, r: 150, c: '#ff2d55' }, // gros foyer rouge (tête d'affiche)
    { x: 58, y: 40, r: 90,  c: '#fb923c' },
    { x: 56, y: 38, r: 52,  c: '#fde047' },
    { x: 30, y: 62, r: 90,  c: '#4ade80' }, // foyer moyen vert
    { x: 76, y: 70, r: 80,  c: '#00e5cc' }, // foyer cyan
    { x: 24, y: 28, r: 70,  c: '#1e90ff' }, // zone calme bleue
    { x: 80, y: 24, r: 60,  c: '#1d2f8f' },
  ]
  return (
    <div className="relative h-full overflow-hidden">
      {/* grille discrète façon plan de ville */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${b.x}%`, top: `${b.y}%`,
            width: b.r, height: b.r,
            transform: 'translate(-50%,-50%)',
            background: b.c,
            filter: 'blur(26px)',
            opacity: 0.65,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.75, 0.55] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
      {/* label du foyer principal */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="font-display text-base font-extrabold leading-tight" style={{ color: '#fff', textShadow: '0 1px 6px #0B0913' }}>
          🔥 El Grande Toto
        </div>
        <div className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,.85)', textShadow: '0 1px 6px #0B0913' }}>
          plein à craquer
        </div>
      </div>
    </div>
  )
}

function VisualTimeline() {
  return (
    <div className="flex h-full items-center gap-3 px-5 py-5">
      {/* Programme */}
      <div
        className="flex-[2] overflow-hidden rounded-2xl border border-white/10 p-3"
        style={{ background: 'var(--ink-700)' }}
      >
        <div className="mb-2.5 flex items-center gap-1.5">
          <Clock size={11} style={{ color: 'var(--sun)' }} />
          <span className="font-mono text-[9.5px] font-bold tracking-widest" style={{ color: 'var(--sun)' }}>PROGRAMME</span>
        </div>
        {[
          { h: '18:00', name: 'Jazz en plein air', now: false },
          { h: '19:00', name: 'La Femme', now: false },
          { h: '20:00', name: '● MAINTENANT', now: true },
          { h: '21:00', name: 'Salsa Party', now: false },
          { h: '22:00', name: 'Electro Night', now: false },
        ].map(r => (
          <div key={r.h} className="mb-1.5 flex items-center gap-2">
            <span className="w-9 shrink-0 font-mono text-[9px]" style={{ color: r.now ? 'var(--glow)' : 'var(--muted)' }}>
              {r.h}
            </span>
            <div
              className="flex-1 truncate rounded-lg px-2 py-1 text-[10px] font-semibold"
              style={{
                background: r.now ? 'rgba(255,92,138,.2)' : 'var(--ink-600)',
                color: r.now ? 'var(--glow)' : 'var(--paper)',
              }}
            >
              {r.name}
            </div>
          </div>
        ))}
      </div>

      {/* Autour */}
      <div
        className="flex-[1.2] overflow-hidden rounded-2xl border border-white/10 p-3"
        style={{ background: 'var(--ink-700)' }}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <Radar size={11} style={{ color: 'var(--azur)' }} />
          <span className="font-mono text-[9.5px] font-bold tracking-widest" style={{ color: 'var(--azur)' }}>AUTOUR</span>
        </div>
        <div className="relative mx-auto mb-3 flex items-center justify-center" style={{ width: 68, height: 68 }}>
          {[60, 44, 28].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{ width: s, height: s, borderColor: `rgba(100,200,255,${0.1 + i * 0.12})` }}
            />
          ))}
          <div className="h-3 w-3 rounded-full" style={{ background: 'var(--azur)', boxShadow: '0 0 8px var(--azur)' }} />
          {[{ x: -18, y: -12 }, { x: 14, y: 8 }, { x: -6, y: 18 }].map((p, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{
                left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
                transform: 'translate(-50%,-50%)',
                background: 'var(--glow)',
              }}
            />
          ))}
        </div>
        {['3 min · Jazz', '8 min · Rock', '12 min · Electro'].map(t => (
          <div key={t} className="mb-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold" style={{ background: 'var(--ink-600)', color: 'var(--muted)' }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}

function VisualItinerary() {
  const stops = [
    { n: 1, time: '18h00', name: 'Jazz en plein air', genre: 'Jazz', color: 'var(--azur)', walk: '12 min' },
    { n: 2, time: '20h30', name: 'Les Wampas',       genre: 'Rock', color: 'var(--glow)', walk: '5 min'  },
    { n: 3, time: '22h00', name: 'Electro Night',    genre: 'Electro', color: 'var(--sun)',  walk: null  },
  ]
  return (
    <div className="flex h-full flex-col justify-center px-6 py-4">
      {stops.map(s => (
        <div key={s.n}>
          <div className="flex items-center gap-3">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold text-[#0B0913]"
              style={{ background: s.color, boxShadow: `0 0 14px ${s.color}88` }}
            >
              {s.n}
            </div>
            <div
              className="flex-1 rounded-xl border border-white/10 px-3 py-2"
              style={{ background: 'var(--ink-700)' }}
            >
              <div className="font-mono text-[10px] font-bold" style={{ color: s.color }}>{s.time} · {s.genre}</div>
              <div className="text-[14px] font-bold">{s.name}</div>
            </div>
          </div>
          {s.walk && (
            <div className="ml-4 flex h-9 items-center gap-2 border-l-2 border-dashed border-white/20 pl-6">
              <Navigation size={12} style={{ color: 'var(--azur)' }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--azur)' }}>{s.walk} à pied</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

