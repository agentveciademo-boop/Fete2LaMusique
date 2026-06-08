'use client'

import { useEffect, useState } from 'react'
import { getNow } from '@/lib/time'

// Instant de référence pour les écrans « live » (Découvrir, Programme, Autour) :
// toujours le vrai maintenant (override ?now= pour les tests dev).
// Init déterministe (SSR == 1er rendu) puis ré-évaluation client toutes les minutes.
export function useReferenceNow(): Date {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    setNow(getNow())
    const id = setInterval(() => setNow(getNow()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
