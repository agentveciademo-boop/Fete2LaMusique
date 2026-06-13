/**
 * Génère public/data/fontaines.json : fontaines à boire de Paris disponibles,
 * depuis l'open data Eau de Paris (fontaines-a-boire).
 *
 * On ne garde que les fontaines disponibles (dispo = OUI, 1211/1327) : une
 * fontaine en panne marquée NON n'a aucun intérêt sur la carte.
 * Statique → figé dans le repo (JSON-first), chargé en lazy avec le calque.
 *
 * Usage : npx tsx etl/fontaines.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const DATASET = 'fontaines-a-boire'
const BASE = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/${DATASET}`

type Position = [number, number]

// Libellés lisibles pour les modèles techniques de l'open data.
const TYPE_LABELS: Record<string, string> = {
  FONTNE_WALLACE: 'Fontaine Wallace',
  FONTAINE_WALLACE: 'Fontaine Wallace',
  BORNE_FONTAINE: 'Borne-fontaine',
  FONTAINE_2EN1: 'Fontaine 2-en-1',
  FONTAINE_ALBIEN: "Fontaine de l'Albien",
  FONTAINE_ARCEAU: 'Fontaine arceau',
  FONTAINE_BOIS: 'Fontaine (bois de Paris)',
  FONTAINE_TOTEM: 'Fontaine totem',
  FTNE_PETILLANTE: 'Fontaine pétillante',
  FTNE_POING_EAU: "Point d'eau",
  FTNE_MILLENAIRE: 'Fontaine du Millénaire',
}

function buildAddress(p: any): string {
  const num = p.no_voirie_pair || p.no_voirie_impair || ''
  const voie = (p.voie ?? '').trim()
  return `${num} ${voie}`.trim()
}

async function main(): Promise<void> {
  // Filtre à la source : uniquement les fontaines disponibles.
  const where = `dispo = "OUI"`
  const params = new URLSearchParams({
    where,
    select: 'type_objet,no_voirie_pair,no_voirie_impair,voie,commune,geo_point_2d',
  })
  const url = `${BASE}/exports/geojson?${params}`
  console.error('Fetch fontaines à boire (Eau de Paris)…')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as { features: Array<{ geometry: any; properties: any }> }
  console.error(`  ${raw.features.length} fontaines disponibles`)

  const features = raw.features
    .filter((f) => Array.isArray(f.geometry?.coordinates))
    .map((f) => {
      const p = f.properties ?? {}
      const coord = f.geometry.coordinates as Position
      const code = (p.type_objet ?? '').trim()
      return {
        type: 'Feature' as const,
        properties: {
          type: TYPE_LABELS[code] ?? 'Fontaine',
          wallace: code === 'FONTNE_WALLACE' || code === 'FONTAINE_WALLACE',
          adresse: buildAddress(p),
          commune: (p.commune ?? '').trim(),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [Math.round(coord[0] * 1e5) / 1e5, Math.round(coord[1] * 1e5) / 1e5],
        },
      }
    })

  const fc = { type: 'FeatureCollection' as const, features }
  const outPath = path.resolve('public/data/fontaines.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(fc))

  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outPath}`)
  console.error(`  ${features.length} fontaines, ${sizeKb} KB`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
