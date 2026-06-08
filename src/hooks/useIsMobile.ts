'use client'

import { useEffect, useState } from 'react'

// Vrai sous le breakpoint Tailwind `md` (768px).
// Sert à n'activer le bottom-sheet (vaul) que sur mobile : sur desktop, le drawer
// vaul restait "ouvert" en même temps que le panneau latéral et posait
// `pointer-events: none` sur le <body>, ce qui bloquait tous les clics de la fiche
// (Réserver, Google Maps, Citymapper). Le panneau latéral gère seul le desktop.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
}
