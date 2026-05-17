'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { EventContent } from './EventContent'
import type { Event } from '@/types/event'

interface Props {
  event: Event | null
  sliderTime: Date
  onClose: () => void
  onSubgenreClick?: (subgenre: string) => void
}

export function EventPanel({ event, sliderTime, onClose, onSubgenreClick }: Props) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="hidden md:flex absolute top-0 right-0 h-full w-[400px] z-20 bg-background border-l shadow-2xl overflow-y-auto flex-col"
        >
          <div className="flex items-center justify-end p-3 border-b shrink-0">
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <EventContent event={event} sliderTime={sliderTime} onSubgenreClick={onSubgenreClick} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
