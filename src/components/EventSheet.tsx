'use client'

import { Drawer } from 'vaul'
import { EventContent } from './EventContent'
import type { Event } from '@/types/event'

interface Props {
  event: Event | null
  sliderTime: Date
  onClose: () => void
  onSubgenreClick?: (subgenre: string) => void
}

export function EventSheet({ event, sliderTime, onClose, onSubgenreClick }: Props) {
  return (
    <Drawer.Root
      open={!!event}
      onOpenChange={open => { if (!open) onClose() }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-30 md:hidden" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden rounded-t-2xl max-h-[95dvh] flex flex-col outline-none"
          style={{ background: 'var(--ink-800)', color: 'var(--paper)' }}
        >
          <div className="mx-auto mt-3 mb-2 w-12 h-1.5 rounded-full shrink-0" style={{ background: 'var(--ink-600)' }} />
          {/* Required by Radix Dialog (underlies vaul) for screen-reader accessibility — visually hidden since the event title is already shown by EventContent. */}
          <Drawer.Title className="sr-only">{event?.title ?? 'Détail de l\'événement'}</Drawer.Title>
          <Drawer.Description className="sr-only">
            {event ? `${event.venue_name} — ${event.address}` : ''}
          </Drawer.Description>
          <div className="overflow-y-auto px-4 pb-8 flex-1">
            {event && <EventContent event={event} sliderTime={sliderTime} onSubgenreClick={onSubgenreClick} />}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
