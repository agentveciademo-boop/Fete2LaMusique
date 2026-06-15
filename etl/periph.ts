/**
 * Génère public/data/periph.json : le tracé du Boulevard Périphérique de Paris.
 *
 * Source : OpenStreetMap, relation 1159709 « Boulevard Périphérique de Paris »
 * (type=route/road), via l'API Overpass. Données sous licence ODbL.
 *
 * Le périph a deux chaussées (intérieure/extérieure) + des bretelles → on ne « recolle »
 * pas les ways un à un. À la place : enveloppe angulaire. Le périph est convexe autour du
 * centre de Paris, donc pour chaque secteur angulaire (180 bins) on garde le point le plus
 * EXTÉRIEUR → on obtient un anneau propre qui suit le bord externe de la rocade.
 *
 * Usage : npx tsx etl/periph.ts   (régénère le fichier ; à relancer seulement si le
 * tracé OSM change, ce qui n'arrive ~jamais — le fichier est commité une fois pour toutes).
 */

import fs from 'node:fs'
import path from 'node:path'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const QUERY = '[out:json][timeout:80];rel(1159709);way(r);out geom;'
const N_BINS = 180

async function main(): Promise<void> {
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'fete2lamusique-etl/1.0 (periph trace)',
      Accept: 'application/json',
    },
    body: 'data=' + encodeURIComponent(QUERY),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const data = (await res.json()) as { elements: Array<{ type: string; geometry?: { lon: number; lat: number }[] }> }

  const pts: [number, number][] = []
  for (const el of data.elements) {
    if (el.type === 'way' && el.geometry) for (const p of el.geometry) pts.push([p.lon, p.lat])
  }
  if (pts.length < 100) throw new Error(`trop peu de points (${pts.length}) — réponse Overpass suspecte`)

  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length

  // Enveloppe angulaire : point le plus éloigné du centre par secteur.
  const best = new Map<number, [number, number, number]>() // bin → [r, lon, lat]
  for (const [x, y] of pts) {
    const ang = Math.atan2(y - cy, x - cx)
    const bin = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * N_BINS) % N_BINS
    const r = Math.hypot(x - cx, y - cy)
    const cur = best.get(bin)
    if (!cur || r > cur[0]) best.set(bin, [r, x, y])
  }

  const ring = [...best.keys()].sort((a, b) => a - b).map((b) => {
    const [, x, y] = best.get(b)!
    return [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]
  })
  ring.push(ring[0]) // fermer l'anneau

  const fc = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Boulevard Périphérique de Paris', source: 'OSM relation 1159709 (ODbL)' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  }

  const out = path.resolve('public/data/periph.json')
  fs.writeFileSync(out, JSON.stringify(fc))
  console.error(`✓ ${out} — ${ring.length} sommets (${best.size}/${N_BINS} secteurs)`)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
