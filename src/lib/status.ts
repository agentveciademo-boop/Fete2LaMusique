import type { Event } from '@/types/event'

export type EventStatus = 'ongoing' | 'soon' | 'later' | 'ended'

export function getEventStatus(event: Event, sliderTime: Date): EventStatus {
  const sliderTs = sliderTime.getTime()
  const startTs  = new Date(event.start_time).getTime()
  const endTs    = new Date(event.end_time).getTime()

  if (endTs < sliderTs) return 'ended'
  if (startTs <= sliderTs && sliderTs <= endTs) return 'ongoing'
  const diffMs = startTs - sliderTs
  if (diffMs < 3 * 60 * 60 * 1000) return 'soon'
  return 'later'
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  ongoing: '🟢 En cours',
  soon:    '🔜',
  later:   '⏰ Plus tard',
  ended:   '✅ Terminé',
}

export function getSoonLabel(event: Event, sliderTime: Date): string {
  const diffMs = new Date(event.start_time).getTime() - sliderTime.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 60) return `🔜 Dans ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `🔜 Dans ${h}h${String(m).padStart(2, '0')}` : `🔜 Dans ${h}h`
}
