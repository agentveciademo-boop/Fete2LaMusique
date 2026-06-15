/**
 * Source « presse » → OutEvent[].
 *
 * Têtes d'affiche repérées dans la presse / annonces officielles (Spotify à
 * Bastille, France Inter à l'Olympia…) que les agendas ne portent pas, et dont
 * la notoriété justifie un point fort sur la heatmap Affluence. Contrairement à
 * la source « manuel » (saisie minimale + géocodage), ces events sont déjà
 * normalisés et curés à la main dans etl/presse-events.json (coords, popularity,
 * genres) — cette source les relit tels quels pour qu'un `npm run sync` ne les
 * efface plus. Cf. champ `popularity` (recherche web inversée des têtes d'affiche).
 *
 * Pour en ajouter une : copier une entrée d'etl/presse-events.json et ajuster.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { Genre, OutEvent } from '../lib/normalize'

const PRESSE_FILE = path.resolve('etl/presse-events.json')

type PresseFile = { events?: Array<Partial<OutEvent> & { id: string; title: string }> }

export async function fetchPresse(): Promise<OutEvent[]> {
  if (!fs.existsSync(PRESSE_FILE)) {
    console.error('[presse] etl/presse-events.json absent → 0 tête d’affiche.')
    return []
  }
  const parsed = JSON.parse(fs.readFileSync(PRESSE_FILE, 'utf-8')) as PresseFile
  const inputs = (parsed.events ?? []).filter((e) => e && e.id && e.title && e.start_time)
  console.error(`[presse] ${inputs.length} tête(s) d’affiche dans presse-events.json…`)

  const out: OutEvent[] = inputs.map((e) => ({
    id: e.id,
    title: e.title.trim(),
    venue_name: (e.venue_name ?? '').trim(),
    address: (e.address ?? '').trim(),
    arrondissement: e.arrondissement ?? null,
    commune: e.commune ?? 'Paris',
    lat: e.lat as number,
    lng: e.lng as number,
    start_time: e.start_time as string,
    end_time: e.end_time ?? (e.start_time as string),
    session_date: e.session_date ?? (e.start_time as string).slice(0, 10),
    source: 'presse',
    source_url: e.source_url ?? null,
    requires_booking: e.requires_booking ?? false,
    booking_url: e.booking_url ?? null,
    genres: (e.genres ?? ['autres']) as Genre[],
    subgenres: e.subgenres ?? [],
    is_outdoor: e.is_outdoor ?? null,
    price_type: e.price_type ?? 'free',
    price_detail: e.price_detail ?? null,
    description: (e.description ?? '').trim(),
    image_url: e.image_url ?? null,
    instagram: e.instagram ?? null,
    tiktok: e.tiktok ?? null,
    popularity: e.popularity,
  }))

  console.error(`[presse] ${out.length} tête(s) d’affiche retenue(s).`)
  return out
}
