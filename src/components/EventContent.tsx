'use client'

import { Clock, MapPin, ExternalLink, Ticket, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GENRE_CONFIG } from '@/data/genres'
import { formatEventTime } from '@/lib/time'
import { getEventStatus } from '@/lib/status'
import { useFavorites } from '@/hooks/useFavorites'
import { useTranslation } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types/event'

const SOURCE_LABELS: Record<NonNullable<Event['source']>, string> = {
  openagenda: 'OpenAgenda',
  qfap: 'Paris.fr',
  both: 'OpenAgenda + Paris.fr',
  manuel: 'Repéré sur les réseaux',
  presse: 'Tête d’affiche (presse)',
}

interface Props {
  event: Event
  sliderTime: Date
  onSubgenreClick?: (subgenre: string) => void
}

export function EventContent({ event, sliderTime, onSubgenreClick }: Props) {
  const { has, toggle } = useFavorites()
  const router = useRouter()
  const { t } = useTranslation()
  const isLiked = has(event.id)

  const handleLike = () => {
    toggle(event.id)
    if (!isLiked) {
      toast.success(t.likeToastAdd, {
        description: event.title,
        action: { label: t.likeSee, onClick: () => router.push('/ma-soiree') },
      })
    } else {
      toast(t.likeToastRemove, { description: event.title })
    }
  }

  const status = getEventStatus(event, sliderTime)

  let statusLabel: string
  if (status === 'soon') {
    const diffMin = Math.round((new Date(event.start_time).getTime() - sliderTime.getTime()) / 60_000)
    statusLabel = t.soonLabel(diffMin)
  } else {
    const map: Record<string, string> = {
      ongoing: t.statusOngoing,
      later: t.statusLater,
      ended: t.statusEnded,
    }
    statusLabel = map[status] ?? ''
  }

  const priceLabel = event.price_type === 'free'       ? t.priceFree
    : event.price_type === 'prix_libre' ? t.priceLibre
    : event.price_type === 'paid'       ? (event.price_detail ?? 'Payant')
    : t.priceUnknown

  const priceClassName = event.price_type === 'free'       ? 'bg-green-900/50 text-green-400'
    : event.price_type === 'prix_libre' ? 'bg-yellow-900/50 text-yellow-400'
    : 'bg-white/10 text-white/60'

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
            {GENRE_CONFIG[genre].icon} {t.genres[genre] ?? GENRE_CONFIG[genre].label}
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
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priceClassName}`}>
          {priceLabel}
        </span>
        {event.is_outdoor === true  && <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/50 text-emerald-400 font-medium">{t.outdoor}</span>}
        {event.is_outdoor === false && <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 font-medium">{t.indoor}</span>}
        {event.requires_booking && <span className="text-xs px-2 py-1 rounded-full bg-amber-900/50 text-amber-400 font-medium">{t.bookingBadge}</span>}
      </div>

      {/* Source attribution */}
      {event.source && (
        <p className="text-[10px] text-muted-foreground">
          {t.source} :{' '}
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
              {' '}— {t.licenseLabel}{' '}
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
        <button
          type="button"
          onClick={handleLike}
          className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border text-[15px] font-bold transition-colors"
          style={isLiked
            ? { background: 'rgba(255,92,138,.15)', borderColor: 'rgba(255,92,138,.45)', color: 'var(--glow)' }
            : { background: 'var(--ink-700)', borderColor: 'rgba(255,255,255,.15)', color: 'var(--paper)' }
          }
        >
          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={isLiked ? 0 : 2} />
          {isLiked ? t.likeAdded : t.likeAdd}
        </button>

        {event.requires_booking && event.booking_url && (
          <a href={event.booking_url} target="_blank" rel="noopener noreferrer"
            className={cn(buttonVariants(), 'w-full gap-2 justify-center bg-amber-500 hover:bg-amber-600 text-white')}>
            <Ticket className="w-4 h-4" /> {t.reserveLink}
          </a>
        )}
        {event.requires_booking && !event.booking_url && (
          <p className="text-xs text-amber-400 bg-amber-900/30 rounded-md px-3 py-2 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 shrink-0" /> {t.reserveNoLink}
          </p>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center w-full gap-2 justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--glow)', color: 'var(--ink-900)' }}>
          <ExternalLink className="w-4 h-4" /> {t.openMaps}
        </a>
        <a href={citymapperUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center w-full gap-2 justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--azur)', color: 'var(--ink-900)' }}>
          <ExternalLink className="w-4 h-4" /> {t.openCitymapper}
        </a>
      </div>
    </div>
  )
}
