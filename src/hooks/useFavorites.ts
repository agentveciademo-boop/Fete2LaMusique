'use client'

import { useCallback, useEffect, useState } from 'react'

// Shortlist persistée en localStorage : alimentée par le Deck (Découvrir) et consommée
// par Ma soirée. Stocke des ids d'events. Aucune dépendance réseau — 100 % côté client.
const STORAGE_KEY = 'fdm-favorites'

function read(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([])

  // Hydrate après le mount (évite tout mismatch SSR), puis suit les autres onglets.
  useEffect(() => {
    setIds(read())
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setIds(read()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const persist = useCallback((next: string[]) => {
    setIds(next)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {/* quota / privé */}
  }, [])

  const add    = useCallback((id: string) => persist(Array.from(new Set([...read(), id]))), [persist])
  const remove = useCallback((id: string) => persist(read().filter(x => x !== id)), [persist])
  const toggle = useCallback((id: string) => {
    const cur = read()
    persist(cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
  }, [persist])
  const has = useCallback((id: string) => ids.includes(id), [ids])

  return { ids, count: ids.length, add, remove, toggle, has }
}
