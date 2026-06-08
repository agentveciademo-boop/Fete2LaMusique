/**
 * Génère public/data/stations.json : stations métro + RER de Paris (~12km),
 * depuis l'open data IDFM (emplacement-des-gares-idf).
 *
 * Une gare physique apparaît plusieurs fois (1 ligne = 1 enregistrement) →
 * dédoublonnage par nom, agrégation des lignes/modes desservis.
 * Statique → figé dans le repo (JSON-first), chargé en lazy avec le calque.
 *
 * Usage : npx tsx etl/stations.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const DATASET = 'emplacement-des-gares-idf'
const BASE = `https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/${DATASET}`

type Position = [number, number]

async function main(): Promise<void> {
  const where = `mode in ("METRO","RER") and within_distance(geo_point_2d, geom'POINT(2.3488 48.8534)', 12km)`
  const params = new URLSearchParams({ where, select: 'nom_gares,indice_lig,mode,geo_point_2d' })
  const url = `${BASE}/exports/geojson?${params}`
  console.error('Fetch stations métro/RER IDFM…')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as { features: Array<{ geometry: any; properties: any }> }
  console.error(`  ${raw.features.length} enregistrements (1 par ligne desservie)`)

  // Dédoublonnage par nom de gare ; agrégation des lignes.
  const byName = new Map<string, { name: string; coord: Position; lines: Set<string>; modes: Set<string> }>()
  for (const f of raw.features) {
    const p = f.properties ?? {}
    const name = (p.nom_gares ?? '').trim()
    const coord = f.geometry?.coordinates as Position | undefined
    if (!name || !coord) continue
    const entry = byName.get(name) ?? { name, coord, lines: new Set<string>(), modes: new Set<string>() }
    if (p.indice_lig) entry.lines.add(String(p.indice_lig))
    if (p.mode) entry.modes.add(p.mode === 'METRO' ? 'metro' : 'rer')
    byName.set(name, entry)
  }

  const features = [...byName.values()].map((s) => ({
    type: 'Feature' as const,
    properties: {
      name: s.name,
      lines: [...s.lines].sort().join(' '),
      mode: s.modes.has('metro') ? 'metro' : 'rer',
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [Math.round(s.coord[0] * 1e5) / 1e5, Math.round(s.coord[1] * 1e5) / 1e5],
    },
  }))

  const fc = { type: 'FeatureCollection' as const, features }
  const outPath = path.resolve('public/data/stations.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(fc))

  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outPath}`)
  console.error(`  ${features.length} stations uniques, ${sizeKb} KB`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
