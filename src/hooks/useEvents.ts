'use client'

import { useEffect, useState } from 'react'
import type { Event } from '@/types/event'
import MOCK_EVENTS from '@/data/mock-events'
import { eventSessionDate } from '@/lib/slots'
import { VISIBLE_SESSION_DATE } from '@/hooks/useFilters'

// Chargement partagé des concerts (ETL → public/data/events.json), avec repli silencieux
// sur les mocks. Factorise le fetch jadis inline dans carte/page.tsx pour que les 5 écrans
// de la refonte lisent la même source de vérité.
export function useEvents() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/data/events.json', { cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<{ events?: Event[] }>) : null))
      .then(data => {
        if (alive && data?.events?.length) setEvents(data.events)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  return { events, loaded }
}

/** Concerts du jour visible (dimanche 21), triés par heure de début. */
export function useDayEvents() {
  const { events, loaded } = useEvents()
  const dayEvents = events
    .filter(e => eventSessionDate(e) === VISIBLE_SESSION_DATE)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  return { events, dayEvents, loaded }
}
