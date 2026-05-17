import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  minutesToDate,
  dateToMinutes,
  pickDefaultSliderTime,
  getNow,
  SLIDER_DEFAULT_TIME,
  SLIDER_MINUTES_MAX,
} from '@/lib/time'

// Filet de sécurité : si une valeur non-finie remonte du Slider (undefined, NaN…),
// on retombe sur le défaut 19h00 — évite un Invalid Date qui se propagerait en boucle
// (sliderTime invalide → dateToMinutes NaN → value=[NaN] → React error #418).
const DEFAULT_MINUTES = dateToMinutes(SLIDER_DEFAULT_TIME)

export function useSliderTime() {
  // Init déterministe (SSR == premier rendu client) pour éviter les hydration mismatches.
  // new Date(0) tombe hors fenêtre festival → renvoie SLIDER_DEFAULT_TIME (19h00).
  const [sliderTime, setSliderTime] = useState<Date>(() => pickDefaultSliderTime(new Date(0)))

  // Côté client : ré-évalue avec le vrai "now" (et l'override dev ?now=…).
  useEffect(() => {
    setSliderTime(pickDefaultSliderTime(getNow()))
  }, [])

  const sliderMinutes = useMemo(() => {
    const m = dateToMinutes(sliderTime)
    return Number.isFinite(m) ? m : DEFAULT_MINUTES
  }, [sliderTime])

  const setSliderMinutes = useCallback((minutes: number) => {
    if (!Number.isFinite(minutes)) return
    const clamped = Math.max(0, Math.min(SLIDER_MINUTES_MAX, minutes))
    setSliderTime(minutesToDate(clamped))
  }, [])

  const resetToNow = useCallback(() => {
    setSliderTime(pickDefaultSliderTime(getNow()))
  }, [])

  return { sliderTime, sliderMinutes, setSliderMinutes, resetToNow }
}
