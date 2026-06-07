import { Clock, MapPin, ExternalLink, Ticket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GENRE_CONFIG } from '@/data/genres'
import { formatEventTime } from '@/lib/time'
import { getEventStatus, getSoonLabel, STATUS_LABELS } from '@/lib/status'
import type { Event } from '@/types/event'

const SOURCE_LABELS: Record<NonNullable<Event['source']>, string> = {
  openagenda: 'OpenAgenda',
  qfap: 'Paris.fr',
  both: 'OpenAgenda + Paris.fr',
}

const PRICE_LABELS: Record<string, { label: string; className: string }> = {
  free:       { label: 'Gratuit',          className: 'bg-green-900/50 text-green-400' },
  prix_libre: { label: 'Prix libre',       className: 'bg-yellow-900/50 text-yellow-400' },
  paid:       { label: '',                 className: 'bg-white/10 text-white/60' },
  unknown:    { label: 'Prix non précisé', className: 'bg-white/10 text-white/40' },
}

interface Props {
  event: Event
  sliderTime: Date
  onSubgenreClick?: (subgenre: string) => void
}

export function EventContent({ event, sliderTime, onSubgenreClick }: Props) {
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

      {/* Subgenres hashtags */}
      {event.subgenres.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 -mt-2">
          {event.subgenres.slice(0, 6).map(sg => (
            <button
              key={sg}
              type="button"
              onClick={() => onSubgenreClick?.(sg)}
              disabled={!onSubgenreClick}
              className="text-xs text-muted-foreground enabled:hover:text-foreground enabled:hover:underline disabled:cursor-default"
            >
              #{sg.replace(/\s+/g, '')}
            </button>
          ))}
          {event.subgenres.length > 6 && (
            <span className="text-xs text-muted-foreground">+{event.subgenres.length - 6}</span>
          )}
        </div>
      )}

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
        {event.is_outdoor === true  && <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/50 text-emerald-400 font-medium">🌳 Plein air</span>}
        {event.is_outdoor === false && <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 font-medium">🏠 En salle</span>}
        {event.requires_booking && <span className="text-xs px-2 py-1 rounded-full bg-amber-900/50 text-amber-400 font-medium">🎟️ Sur réservation</span>}
      </div>

      {/* Source attribution — affichée pour tous les concerts. ODbL = obligation légale pour les données Paris.fr. */}
      {event.source && (
        <p className="text-[10px] text-muted-foreground">
          Source :{' '}
          {event.source_url ? (
            <a href={event.source_url} target="_blank" rel="noopener noreferrer"
               className="underline underline-offset-2 hover:text-foreground transition-colors">
              {SOURCE_LABELS[event.source]}
            </a>
          ) : (
            SOURCE_LABELS[event.source]
          )}
          {(event.source === 'qfap' || event.source === 'both') && (
            <>
              {' '}— données sous licence{' '}
              <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer"
                 className="underline underline-offset-2 hover:text-foreground transition-colors">
                ODbL
              </a>
            </>
          )}
        </p>
      )}

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

      {/* CTAs */}
      <div className="flex flex-col gap-2 pt-2">
        {event.requires_booking && event.booking_url && (
          <a href={event.booking_url} target="_blank" rel="noopener noreferrer"
            className={cn(buttonVariants(), 'w-full gap-2 justify-center bg-amber-500 hover:bg-amber-600 text-white')}>
            <Ticket className="w-4 h-4" /> Réserver
          </a>
        )}
        {event.requires_booking && !event.booking_url && (
          <p className="text-xs text-amber-400 bg-amber-900/30 rounded-md px-3 py-2 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 shrink-0" /> Réservation conseillée — voir la source ci-dessus.
          </p>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center w-full gap-2 justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--glow)', color: 'var(--ink-900)' }}>
          <ExternalLink className="w-4 h-4" /> Ouvrir dans Google Maps
        </a>
        <a href={citymapperUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center w-full gap-2 justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--azur)', color: 'var(--ink-900)' }}>
          <ExternalLink className="w-4 h-4" /> Ouvrir dans Citymapper
        </a>
      </div>
    </div>
  )
}
