/**
 * ETL multi-source → public/data/events.json (JSON-first, pas de DB).
 *
 * Orchestrateur : récupère chaque source (OpenAgenda, Que faire à Paris…),
 * fusionne/dédoublonne (lib/dedup.ts), et écrit public/data/events.json.
 * Chaque event porte sa `source` ('openagenda' | 'qfap' | 'both') + son
 * `source_url` → affichés dans la fiche.
 *
 * Ajouter une source = un fichier sources/<nom>.ts exportant
 * `fetch<Nom>(): Promise<OutEvent[]>`, puis l'ajouter au tableau SOURCES.
 *
 * Usage :
 *   npx tsx etl/sync.ts                          # toutes les sources
 *   SOURCES=openagenda npx tsx etl/sync.ts        # OpenAgenda seul
 *   SOURCE_AGENDA_UID=7476421 npx tsx etl/sync.ts # OpenAgenda archive 2025 (dev)
 * Clés / config dans etl/.env (gitignored).
 */

import './lib/env'
import fs from 'node:fs'
import path from 'node:path'
import { type OutEvent, pruneAutres } from './lib/normalize'
import { dedup } from './lib/dedup'
import { fetchOpenAgenda } from './sources/openagenda'
import { fetchQfap } from './sources/qfap'

type SourceDef = { name: string; fetch: () => Promise<OutEvent[]> }

const ALL_SOURCES: SourceDef[] = [
  { name: 'openagenda', fetch: fetchOpenAgenda },
  { name: 'qfap', fetch: fetchQfap },
]

// Filtre optionnel : SOURCES=openagenda,qfap (défaut = toutes).
function selectedSources(): SourceDef[] {
  const want = (process.env.SOURCES ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (want.length === 0) return ALL_SOURCES
  return ALL_SOURCES.filter((s) => want.includes(s.name))
}

async function main(): Promise<void> {
  const sources = selectedSources()
  console.error(`Sources actives : ${sources.map((s) => s.name).join(', ')}\n`)

  const collected: OutEvent[] = []
  const perSource: Record<string, number> = {}
  for (const src of sources) {
    const events = await src.fetch()
    perSource[src.name] = events.length
    collected.push(...events)
    console.error('')
  }

  // Fusion / dédup cross-source.
  const { events: deduped, merged } = dedup(collected)

  // Nettoyage genres (post-fusion) : retire 'autres' quand un vrai genre existe.
  for (const e of deduped) e.genres = pruneAutres(e.genres)

  // Enrichments manuels (instagram/tiktok non fournis par les sources).
  // Clé = ID de base sans suffixe timing (ex: "oa-38289446" couvre oa-38289446-0, -1…).
  const enrichmentsPath = path.resolve('etl/enrichments.json')
  if (fs.existsSync(enrichmentsPath)) {
    type Enrichment = { instagram?: string; tiktok?: string }
    const raw = JSON.parse(fs.readFileSync(enrichmentsPath, 'utf-8')) as Record<string, Enrichment>
    let enriched = 0
    for (const e of deduped) {
      const baseId = e.id.replace(/-\d+$/, '')
      const enrich = raw[baseId]
      if (!enrich) continue
      if (enrich.instagram && !e.instagram) e.instagram = enrich.instagram
      if (enrich.tiktok && !e.tiktok) e.tiktok = enrich.tiktok
      enriched++
    }
    if (enriched > 0) console.error(`  enrichments manuels appliqués : ${enriched} events`)
  }

  // Tri stable par start_time (minimise les diffs git).
  deduped.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id))

  const counts = deduped.reduce(
    (acc, e) => {
      acc[e.source] = (acc[e.source] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const outputPath = path.resolve('public/data/events.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        sources: perSource,
        event_count: deduped.length,
        events: deduped,
      },
      null,
      2,
    ),
  )

  const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1)
  console.error(`\n✓ ${outputPath}`)
  console.error(`  collectés (avant dédup) : ${collected.length} → ${Object.entries(perSource).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  console.error(`  fusions (OA+QFAP → both) : ${merged}`)
  console.error(`  events finaux : ${deduped.length} (${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')})`)
  console.error(`  taille : ${sizeKb} KB`)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
