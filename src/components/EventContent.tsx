import { Clock, MapPin, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GENRE_CONFIG } from '@/data/genres'
import { formatEventTime } from '@/lib/time'
import { getEventStatus, getSoonLabel, STATUS_LABELS } from '@/lib/status'
import type { Event } from '@/types/event'

const PRICE_LABELS: Record<string, { label: string; className: string }> = {
  free:       { label: 'Gratuit',       className: 'bg-green-100 text-green-800' },
  prix_libre: { label: 'Prix libre',    className: 'bg-yellow-100 text-yellow-800' },
  paid:       { label: '',              className: 'bg-gray-100 text-gray-700' },
  unknown:    { label: 'Prix non précisé', className: 'bg-gray-100 text-gray-400' },
}

interface Props {
  event: Event
  sliderTime: Date
}

export function EventContent({ event, sliderTime }: Props) {
  const status = getEventStatus(event, sliderTime)
  const priceEntry = PRICE_LABELS[event.price_type]
  const priceLabel = event.price_type === 'paid'
    ? (event.price_detail ?? 'Payant')
    : priceEntry.label

  const statusLabel = status === 'soon'
    ? getSoonLabel(event, sliderTime)
    : STATUS_LABELS[status]

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`
  const citymapperUrl = `https://citymapper.com/directions?endcoord=${event.lat},${event.lng}&endname=${encodeURIComponent(event.venue_name)}`

  return (
    <div className="flex flex-col gap-4">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-lg" />
      )}

      {/* Genre badges */}
      <div className="flex flex-wrap gap-1.5">
        {event.genres.map(genre => (
          <Badge
            key={genre}
            style={{ backgroundColor: GENRE_CONFIG[genre].color, color: '#fff' }}
            className="border-0"
          >
            {GENRE_CONFIG[genre].icon} {GENRE_CONFIG[genre].label}
          </Badge>
        ))}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>

      {/* Venue — clickable, opens Google Maps */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 text-sm group hover:text-primary transition-colors"
      >
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        <div>
          <div className="font-semibold group-hover:underline">{event.venue_name}</div>
          <div className="text-muted-foreground">{event.address}</div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>

      {/* Time + status */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span>{formatEventTime(event.start_time)} → {formatEventTime(event.end_time)}</span>
        <span className="ml-2 font-medium">{statusLabel}</span>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priceEntry.className}`}>
          {priceLabel}
        </span>
        {event.is_outdoor === true  && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">🌳 Plein air</span>}
        {event.is_outdoor === false && <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">🏠 En salle</span>}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

      {/* CTAs */}
      <div className="flex flex-col gap-2 pt-2">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className={cn(buttonVariants(), 'w-full gap-2 justify-center')}>
          <ExternalLink className="w-4 h-4" /> Ouvrir dans Google Maps
        </a>
        <a href={citymapperUrl} target="_blank" rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2 justify-center')}>
          <ExternalLink className="w-4 h-4" /> Ouvrir dans Citymapper
        </a>
      </div>
    </div>
  )
}
