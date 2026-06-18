// Génération des pins « goutte » (teardrop) colorés par genre — partagée entre la carte
// principale (Map.tsx) et l'écran Affluence (AffluenceMap.tsx). Rendu canvas → ImageData
// enregistrée dans MapLibre via map.addImage, sous une clé = `pie_key` (ex. "jazz+rock",
// suffixe "|book" pour « sur réservation »). Code navigateur uniquement (window/document) :
// à n'appeler que dans des composants chargés en ssr:false.
//
// Règle de remplissage de la tête :
//   1 genre   → tête pleine couleur du genre + anneau blanc + cœur blanc
//   2 genres  → tête scindée 50/50 (gauche/droite)
//   3 genres+ → dominante pleine + pastille « +N » en haut à droite de la tête
// La POINTE de la goutte désigne le lieu exact (à utiliser avec icon-anchor: 'bottom').

import { GENRE_CONFIG } from '@/data/genres'
import type { Event, Genre } from '@/types/event'

// Jaune « Sur réservation » : anneau épais des pins concernés (renfort du halo jaune).
export const BOOKING_RING = '#FFB300'

const HEAD_R  = 13                              // rayon de la tête de la goutte
const ICON_W  = 34                              // largeur intrinsèque (place anneau + pastille +N)
const HEAD_CY = HEAD_R + 3                       // centre de la tête (3px de marge haute)
const TIP_Y   = HEAD_CY + HEAD_R * Math.SQRT2     // pointe = coin net pivoté à 45°
const ICON_H  = Math.ceil(TIP_Y + 3)             // hauteur intrinsèque (pointe ~ en bas)

// Tracé d'un carré à coins arrondis SAUF un coin net (bottom-right ici), pivoté 45° pour
// que ce coin net devienne la pointe vers le bas. arcTo → compatible tous navigateurs.
function teardropPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4) // 45° horaire → coin bas-droit pointe vers le bas
  const x = -r, y = -r, s = 2 * r
  // coins : [tl, tr, br=0 (net), bl]
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + s - r, y)
  ctx.arcTo(x + s, y, x + s, y + r, r)        // tr
  ctx.lineTo(x + s, y + s)                     // br = net (pas d'arc)
  ctx.lineTo(x + r, y + s)
  ctx.arcTo(x, y + s, x, y + s - r, r)         // bl
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)                 // tl
  ctx.closePath()
  ctx.restore()
}

export function drawGenrePin(genres: Genre[], ringColor: string = '#fff', ringWidth: number = 2.5): { data: ImageData; pixelRatio: number } | null {
  const dpr = Math.max(2, Math.round(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  canvas.width = ICON_W * dpr
  canvas.height = ICON_H * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(dpr, dpr)

  const cx = ICON_W / 2
  const list = genres.length ? genres : (['autres'] as Genre[])
  const col = (g: Genre) => GENRE_CONFIG[g]?.color ?? '#9D97B0'

  // Remplissage de la tête (clip à la goutte ; on peint en repères écran).
  ctx.save()
  teardropPath(ctx, cx, HEAD_CY, HEAD_R)
  ctx.clip()
  if (list.length === 2) {
    ctx.fillStyle = col(list[0]); ctx.fillRect(0, 0, cx, ICON_H)            // moitié gauche
    ctx.fillStyle = col(list[1]); ctx.fillRect(cx, 0, ICON_W - cx, ICON_H)  // moitié droite
  } else {
    ctx.fillStyle = col(list[0]); ctx.fillRect(0, 0, ICON_W, ICON_H)
  }
  ctx.restore()

  // Anneau extérieur (détache le pin du fond). Blanc par défaut ; jaune épais à réserver.
  teardropPath(ctx, cx, HEAD_CY, HEAD_R)
  ctx.lineWidth = ringWidth
  ctx.strokeStyle = ringColor
  ctx.stroke()

  // Cœur blanc au centre de la tête (point de visée).
  ctx.beginPath(); ctx.arc(cx, HEAD_CY, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'; ctx.fill()

  // Pastille « +N » pour 3 genres et plus (couleur du 2e genre, liseré encre).
  if (list.length >= 3) {
    const bx = cx + HEAD_R * 0.72, by = HEAD_CY - HEAD_R * 0.72, br = 6.5
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fillStyle = col(list[1]); ctx.fill()
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#0B0913'; ctx.stroke()
    ctx.fillStyle = '#0B0913'
    ctx.font = '700 8px monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`+${list.length - 1}`, bx, by + 0.5)
  }

  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: dpr }
}

// Pré-génère et enregistre toutes les icônes goutte nécessaires (une par combinaison de
// genres présente dans les events). Idempotent (hasImage). Plus fiable que de compter sur
// `styleimagemissing`, qui peut se déclencher avant que le handler soit branché.
export function ensurePieImages(map: any, events: Event[]): void {
  for (const ev of events) {
    const g = ev.genres.slice(0, 4)
    const base = g.join('+')
    if (!base) continue
    // Concert à réserver = image distincte (suffixe |book) avec anneau jaune épais.
    const key = ev.requires_booking ? `${base}|book` : base
    if (map.hasImage(key)) continue
    const icon = ev.requires_booking
      ? drawGenrePin(g as Genre[], BOOKING_RING, 3.5)
      : drawGenrePin(g as Genre[])
    if (icon) map.addImage(key, icon.data, { pixelRatio: icon.pixelRatio })
  }
}

// Branche le fallback `styleimagemissing` : MapLibre réclame chaque icône absente (id =
// pie_key, éventuellement suffixé "|book"), on la (re)génère à la volée. Survit aux swaps
// de fond de carte (les images sont alors re-réclamées).
export function registerPieImageHandler(map: any): void {
  map.on('styleimagemissing', (ev: { id: string }) => {
    if (!ev.id || map.hasImage(ev.id)) return
    const [genrePart, flag] = ev.id.split('|')
    const genres = genrePart.split('+').filter((g: string): g is Genre => g in GENRE_CONFIG)
    const icon = flag === 'book' ? drawGenrePin(genres, BOOKING_RING, 3.5) : drawGenrePin(genres)
    if (icon && !map.hasImage(ev.id)) map.addImage(ev.id, icon.data, { pixelRatio: icon.pixelRatio })
  })
}
