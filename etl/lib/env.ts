/**
 * Chargement des variables d'environnement depuis etl/.env (gitignored).
 * Module à effet de bord : importer en PREMIER (avant tout module qui lit
 * process.env), l'import déclenche le chargement.
 */

import fs from 'node:fs'
import path from 'node:path'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  try {
    const content = fs.readFileSync(path.resolve('etl/.env'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* pas de .env : on compte sur l'env système */
  }
}

loadEnv()
