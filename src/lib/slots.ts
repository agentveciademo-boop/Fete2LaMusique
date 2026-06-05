import type { Event } from '@/types/event'
import { parisHour, parisDate } from './session'

export type SlotId = 'matin' | 'debut-aprem' | 'fin-aprem' | 'soiree' | 'nuit'

export interface SlotDef {
  id: SlotId
  label: string
  emoji: string
  /** Heure de référence Europe/Paris (statut « en cours / à venir », halo pulse). */
  refHour: number
}

/**
 * Tranches horaires de la Fête (dimanche 21). Bornes calées sur la densité réelle
 * des concerts (cf. daily-log 2026-06-05) :
 *   matin 16 · début aprem 47 · fin aprem 62 · soirée 86 · nuit 14.
 * L'après-midi (la moitié des concerts) est coupée en deux ; la soirée reste d'un
 * bloc (le pic, dur à découper sans tasser) ; la nuit = les after-parties (jusqu'à 3h).
 */
export const SLOTS: readonly SlotDef[] = [
  { id: 'matin',       label: 'Matin',       emoji: '🌅', refHour: 10 },
  { id: 'debut-aprem', label: 'Début aprem', emoji: '🌤️', refHour: 14 },
  { id: 'fin-aprem',   label: 'Fin aprem',   emoji: '🌇', refHour: 16 },
  { id: 'soiree',      label: 'Soirée',      emoji: '🌆', refHour: 19 },
  { id: 'nuit',        label: 'Nuit',        emoji: '🌙', refHour: 22 },
] as const

/**
 * Range une heure locale (0–23) dans sa tranche. Partition complète des 24h —
 * les heures 06h/07h (vides à la FdM) tombent dans « matin » par cohérence.
 *   nuit  : 21h–05h (inclut les after-parties 00h–03h)
 *   matin : 06h–12h
 *   début : 13h–15h
 *   fin   : 16h–17h
 *   soir  : 18h–20h
 */
export function hourToSlot(hour: number): SlotId {
  if (hour >= 21 || hour < 6) return 'nuit'
  if (hour < 13) return 'matin'
  if (hour < 16) return 'debut-aprem'
  if (hour < 18) return 'fin-aprem'
  return 'soiree'
}

/** Tranche d'un concert, d'après son heure de début (Europe/Paris). */
export function eventSlot(event: Event): SlotId {
  return hourToSlot(parisHour(event.start_time))
}

/**
 * Jour de session d'un concert : champ ETL `session_date` s'il est fourni,
 * sinon la date calendaire Paris de l'heure de début (fallback mocks/legacy).
 */
export function eventSessionDate(event: Event): string {
  return event.session_date ?? parisDate(event.start_time)
}
