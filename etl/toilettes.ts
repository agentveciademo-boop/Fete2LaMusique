/**
 * Génère public/data/toilettes.json : toilettes publiques de Paris ouvertes 24h/24,
 * depuis l'open data Ville de Paris (sanisettesparis, Direction de la Voirie).
 *
 * On filtre "En service" ET horaire "24/24h" (~34 installations) : la Fête de la
 * Musique se vit la nuit, seules les toilettes ouvertes en continu sont utiles.
 * Statique → figé dans le repo (JSON-first), chargé en lazy avec le calque.
 *
 * Usage : npx tsx etl/toilettes.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const DATASET = 'sanisettesparis'
const BASE = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/${DATASET}`

type Position = [number, number]

async function main(): Promise<void> {
  // Filtre à la source : toilettes en service ET ouvertes 24h/24.
  const where = `statut = "En service" and horaire = "24/24h"`
  const params = new URLSearchParams({
    where,
    select: 'type,adresse,arrondissement,horaire,acces_pmr,relais_bebe,geo_point_2d',
  })
  const url = `${BASE}/exports/geojson?${params}`
  console.error('Fetch toilettes publiques (Ville de Paris)…')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as { features: Array<{ geometry: any; properties: any }> }
  console.error(`  ${raw.features.length} toilettes en service`)

  const features = raw.features
    .filter((f) => Array.isArray(f.geometry?.coordinates))
    .map((f) => {
      const p = f.properties ?? {}
      const coord = f.geometry.coordinates as Position
      return {
        type: 'Feature' as const,
        properties: {
          type: (p.type ?? '').trim(),
          adresse: (p.adresse ?? '').trim(),
          arrondissement: (p.arrondissement ?? '').trim(),
          horaire: (p.horaire ?? '').trim(),
          pmr: p.acces_pmr === 'Oui',
          relais_bebe: p.relais_bebe === 'Oui',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [Math.round(coord[0] * 1e5) / 1e5, Math.round(coord[1] * 1e5) / 1e5],
        },
      }
    })

  const fc = { type: 'FeatureCollection' as const, features }
  const outPath = path.resolve('public/data/toilettes.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(fc))

  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outPath}`)
  console.error(`  ${features.length} toilettes, ${sizeKb} KB`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
