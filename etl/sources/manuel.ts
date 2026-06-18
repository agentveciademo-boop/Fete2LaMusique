/**
 * Source « manuel » → OutEvent[].
 *
 * Concerts repérés à la main (captures d'écran de réseaux sociaux, bouche à
 * oreille…) que les agendas officiels (OpenAgenda, Que faire à Paris) ne
 * connaissent pas. On les saisit dans etl/manual-events.json, format minimal et
 * lisible ; cette source les normalise en OutEvent et géocode l'adresse via la
 * Base Adresse Nationale (api-adresse.data.gouv.fr — gratuit, sans clé).
 *
 * Mode d'emploi complet : etl/AJOUTER-UN-CONCERT.md
 *
 * Champ obligatoire : title, venue_name, start_time, et (address OU lat+lng).
 * Tout le reste est optionnel et a un défaut honnête (pas d'invention).
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  type Genre,
  type OutEvent,
  VALID_GENRES,
  addHours,
  extractArrondissement,
  inferOutdoorFromText,
  inParis,
  sessionDate,
} from '../lib/normalize'

const MANUAL_FILE = path.resolve('etl/manual-events.json')

// Id stable dérivé du contenu (pas de l'ordre dans le fichier) : réordonner
// manual-events.json ne change pas les ids → favoris localStorage préservés.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// Ce que Florian saisit dans manual-events.json. Volontairement permissif :
// tout est optionnel sauf le strict nécessaire pour placer un point sur la carte.
type ManualInput = {
  title?: string
  venue_name?: string
  address?: string
  // Heure locale Paris. Accepte "2026-06-20T20:30" ; le fuseau +02:00 (juin) est
  // ajouté automatiquement s'il manque.
  start_time?: string
  end_time?: string // optionnel → début + 3 h
  genres?: string[] // optionnel → ['autres']
  subgenres?: string[]
  is_outdoor?: boolean | null
  instagram?: string | null
  tiktok?: string | null
  description?: string
  image_url?: string | null
  source_url?: string | null // le post d'origine (Insta, TikTok…)
  requires_booking?: boolean
  booking_url?: string | null
  // Coordonnées : si fournies, court-circuitent le géocodage (utile si la BAN
  // se trompe ou pour un lieu sans adresse précise — place, parc…).
  lat?: number | null
  lng?: number | null
  // Code postal pour déduire l'arrondissement quand l'adresse n'en contient pas.
  zipcode?: string | null
}

type ManualFile = { events?: ManualInput[] }

// "2026-06-20T20:30" → "2026-06-20T20:30:00+02:00". Idempotent si déjà complet.
function toParisIso(raw: string): string {
  const s = raw.trim()
  if (/[+-]\d{2}:?\d{2}$|Z$/.test(s)) return s // fuseau déjà présent
  const withSeconds = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s
  return `${withSeconds}+02:00` // FdM = juin → CEST (UTC+2)
}

type GeoHit = { lat: number; lng: number; zipcode: string | null }

async function geocode(address: string): Promise<GeoHit | null> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] }
          properties?: { postcode?: string }
        }>
      }
      const f = data.features?.[0]
      const coords = f?.geometry?.coordinates
      if (!coords) return null
      return { lng: coords[0], lat: coords[1], zipcode: f?.properties?.postcode ?? null }
    } catch (e) {
      const wait = 400 * 2 ** attempt
      console.error(`[manuel]   géocodage tenté ${attempt}/3 échoué (${(e as Error).message}); retry ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  return null
}

function mapGenres(raw: string[] | undefined): Genre[] {
  if (!raw || raw.length === 0) return ['autres']
  const out = raw.filter((g): g is Genre => VALID_GENRES.has(g as Genre))
  const ignored = raw.filter((g) => !VALID_GENRES.has(g as Genre))
  if (ignored.length) console.error(`[manuel]   genres ignorés (hors vocabulaire) : ${ignored.join(', ')}`)
  return out.length ? out : ['autres']
}

export async function fetchManuel(): Promise<OutEvent[]> {
  if (!fs.existsSync(MANUAL_FILE)) {
    console.error('[manuel] etl/manual-events.json absent → 0 concert.')
    return []
  }
  const parsed = JSON.parse(fs.readFileSync(MANUAL_FILE, 'utf-8')) as ManualFile
  const inputs = (parsed.events ?? []).filter((e) => e && (e.title || e.venue_name))
  console.error(`[manuel] ${inputs.length} concert(s) saisi(s) dans manual-events.json…`)

  const out: OutEvent[] = []
  let idx = 0
  for (const m of inputs) {
    idx++
    const label = m.title || m.venue_name || `#${idx}`

    if (!m.title || !m.venue_name || !m.start_time) {
      console.error(`[manuel]   ⚠ ignoré « ${label} » : title, venue_name et start_time sont obligatoires.`)
      continue
    }

    // Coordonnées : explicites, sinon géocodage de l'adresse.
    let lat = m.lat ?? null
    let lng = m.lng ?? null
    let zipcode = m.zipcode ?? null
    if ((lat == null || lng == null) && m.address) {
      const hit = await geocode(m.address)
      if (hit) {
        lat = hit.lat
        lng = hit.lng
        zipcode = zipcode ?? hit.zipcode
      }
    }
    if (lat == null || lng == null) {
      console.error(`[manuel]   ⚠ ignoré « ${label} » : pas de coordonnées (adresse introuvable, ajoute lat/lng à la main).`)
      continue
    }
    if (!inParis(lat, lng)) {
      console.error(`[manuel]   ⚠ « ${label} » hors périmètre Paris (10 km) — gardé quand même (saisie volontaire).`)
    }

    const start = toParisIso(m.start_time)
    const end = m.end_time ? toParisIso(m.end_time) : addHours(start, 3)
    const isOutdoor = m.is_outdoor ?? inferOutdoorFromText(m.venue_name, m.address)
    const baseId = `manuel-${slugify(`${m.title} ${m.venue_name}`)}-${start.slice(0, 10)}`

    out.push({
      id: baseId,
      title: m.title.trim(),
      venue_name: m.venue_name.trim(),
      address: (m.address ?? '').trim(),
      arrondissement: extractArrondissement(zipcode),
      commune: 'Paris',
      lat,
      lng,
      start_time: start,
      end_time: end,
      session_date: sessionDate(start),
      source: 'manuel',
      source_url: m.source_url ?? null,
      requires_booking: m.requires_booking ?? false,
      booking_url: m.booking_url ?? null,
      genres: mapGenres(m.genres),
      subgenres: m.subgenres ?? [],
      is_outdoor: isOutdoor,
      // La FdM est gratuite : on ne devine pas de prix.
      price_type: 'free',
      price_detail: null,
      description: (m.description ?? '').trim(),
      image_url: m.image_url ?? null,
      instagram: m.instagram ?? null,
      tiktok: m.tiktok ?? null,
    })
    console.error(`[manuel]   ✓ « ${label} » → ${lat.toFixed(5)},${lng.toFixed(5)}`)
  }

  console.error(`[manuel] ${out.length} concert(s) retenu(s).`)
  return out
}
