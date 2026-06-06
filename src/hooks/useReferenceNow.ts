'use client'

import { useEffect, useState } from 'react'
import { pickDefaultSliderTime, getNow, SLIDER_DEFAULT_TIME } from '@/lib/time'

// Instant de référence pour les écrans « live » (Découvrir, Programme, Autour) :
// pendant le festival = le vrai maintenant ; hors festival = 19h00 le 21 juin (cœur de
// soirée) pour que les écrans aient toujours du contenu pertinent en démo/preview.
// Init déterministe (SSR == 1er rendu) puis ré-évaluation client (gère l'override ?now=).
export function useReferenceNow(): Date {
  const [now, setNow] = useState<Date>(() => SLIDER_DEFAULT_TIME)
  useEffect(() => {
    setNow(pickDefaultSliderTime(getNow()))
    const id = setInterval(() => setNow(pickDefaultSliderTime(getNow())), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
