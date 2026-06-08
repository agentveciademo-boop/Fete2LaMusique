/**
 * Génère public/data/transit.json : tracés métro (1-14) + RER (A-E) de Paris,
 * depuis l'open data Île-de-France (couleurs officielles incluses).
 *
 * L'export brut fait ~3,3 Mo (géométrie très dense) → on simplifie :
 *   - décimation radiale des points (tolérance ~30m, invisible à l'échelle ville)
 *   - arrondi des coordonnées à 5 décimales
 * Statique (le réseau ne bouge pas) → figé dans le repo, JSON-first.
 *
 * Usage : npx tsx etl/transit.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const DATASET = 'traces-des-lignes-de-transport-en-commun-idfm'
const BASE = `https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/${DATASET}`
const RER_LINES = ['A', 'B', 'C', 'D', 'E']
const SIMPLIFY_TOLERANCE = 0.0012 // ~120m en degrés (fond de carte, échelle ville)
const COORD_DECIMALS = 5

// Zone Paris + petite couronne (~12 km autour du centre) — cohérent avec le
// rayon des concerts. On clippe les tracés ici : inutile d'afficher les RER
// jusqu'à Cergy/Marne-la-Vallée sur une carte centrée Paris.
const BBOX = { minLng: 2.189, maxLng: 2.509, minLat: 48.743, maxLat: 48.963 }

type Position = [number, number]

function inBbox(p: Position): boolean {
  return p[0] >= BBOX.minLng && p[0] <= BBOX.maxLng && p[1] >= BBOX.minLat && p[1] <= BBOX.maxLat
}

// Découpe une ligne en segments de points consécutifs dans la bbox.
function clipToBbox(coords: Position[]): Position[][] {
  const segments: Position[][] = []
  let cur: Position[] = []
  for (const p of coords) {
    if (inBbox(p)) {
      cur.push(p)
    } else if (cur.length) {
      segments.push(cur)
      cur = []
    }
  }
  if (cur.length) segments.push(cur)
  return segments
}

// Simplification radiale : garde le 1er point, saute les points trop proches du
// dernier point gardé, garde toujours le dernier.
function simplifyLine(coords: Position[], tol: number): Position[] {
  if (coords.length <= 2) return coords
  const out: Position[] = [coords[0]]
  let last = coords[0]
  for (let i = 1; i < coords.length - 1; i++) {
    const dx = coords[i][0] - last[0]
    const dy = coords[i][1] - last[1]
    if (dx * dx + dy * dy >= tol * tol) {
      out.push(coords[i])
      last = coords[i]
    }
  }
  out.push(coords[coords.length - 1])
  return out
}

function roundPos(p: Position): Position {
  const f = 10 ** COORD_DECIMALS
  return [Math.round(p[0] * f) / f, Math.round(p[1] * f) / f]
}

async function main(): Promise<void> {
  const where = `route_type="Subway" or (route_type="Rail" and route_short_name in ("A","B","C","D","E"))`
  const params = new URLSearchParams({ where, select: 'route_short_name,route_type,route_color' })
  const url = `${BASE}/exports/geojson?${params}`
  console.error('Fetch export GeoJSON IDFM…')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as { features: Array<{ geometry: any; properties: any }> }
  console.error(`  ${raw.features.length} lignes brutes`)

  const features = raw.features
    .map((f) => {
      const p = f.properties ?? {}
      const line = String(p.route_short_name)
      const mode = p.route_type === 'Subway' ? 'metro' : 'rer'
      // garde métro 1-14 (+ 3B/7B) et RER A-E
      if (mode === 'rer' && !RER_LINES.includes(line)) return null

      const geom = f.geometry
      let lines: Position[][] = []
      if (geom?.type === 'LineString') lines = [geom.coordinates]
      else if (geom?.type === 'MultiLineString') lines = geom.coordinates
      const simplified: Position[][] = []
      for (const l of lines) {
        for (const seg of clipToBbox(l)) {
          const s = simplifyLine(seg, SIMPLIFY_TOLERANCE).map(roundPos)
          if (s.length >= 2) simplified.push(s)
        }
      }
      if (simplified.length === 0) return null

      return {
        type: 'Feature' as const,
        properties: { line, mode, color: `#${p.route_color}` },
        geometry: { type: 'MultiLineString' as const, coordinates: simplified },
      }
    })
    .filter(Boolean)
    // métro au-dessus du RER pour la lisibilité au rendu
    .sort((a, b) => (a!.properties.mode === 'rer' ? -1 : 1))

  const fc = { type: 'FeatureCollection' as const, features }
  const outPath = path.resolve('public/data/transit.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(fc))

  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outPath}`)
  console.error(`  ${features.length} lignes, ${sizeKb} KB`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
