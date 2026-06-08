import type { Genre } from '@/types/event'

// Palette « glow » (refonte UX 2026-06) : teintes éclaircies pensées pour des points
// lumineux sur carte sombre (chaque pin/point porte un box-shadow coloré « lumière de la
// ville »). Réparties sur toute la roue chromatique, la bande jaune/or (~40–58°) reste
// volontairement LIBRE — réservée au signal « Sur réservation » (halo + anneau jaune).
// ⚠️ Sur fond clair ou avec texte blanc dessus, préférer un texte foncé (#0B0913).
export const GENRE_CONFIG: Record<Genre, { label: string; color: string; icon: string }> = {
  rock:        { label: 'Rock',       color: '#FF4D4D', icon: '🎸' }, // rouge
  rap:         { label: 'Rap',        color: '#FF8A3D', icon: '🎤' }, // orange
  jazz:        { label: 'Jazz',       color: '#C9D11A', icon: '🎷' }, // or-olive (hors bande jaune)
  fanfare:     { label: 'Fanfare',    color: '#8FD13A', icon: '🎺' }, // vert-olive
  trad:        { label: 'Trad',       color: '#C98A3D', icon: '🥁' }, // terre cuite
  'soul-funk': { label: 'Soul/Funk',  color: '#E45CD6', icon: '🕺' }, // magenta (disco)
  reggae:      { label: 'Reggae',     color: '#3FD46E', icon: '🌴' }, // vert
  folk:        { label: 'Folk',       color: '#5AD15A', icon: '🌾' }, // vert clair
  world:       { label: 'World',      color: '#2FD1AE', icon: '🌍' }, // sarcelle
  electro:     { label: 'Électro',    color: '#3DB6FF', icon: '🎧' }, // cyan-azur
  blues:       { label: 'Blues',      color: '#5C7AFF', icon: '🎻' }, // bleu-violet
  classique:   { label: 'Classique',  color: '#9B6BFF', icon: '🎹' }, // violet
  chorale:     { label: 'Chorale',    color: '#C28AFF', icon: '🎼' }, // violet clair
  pop:         { label: 'Pop',        color: '#FF5CC8', icon: '🎀' }, // magenta
  variete:     { label: 'Variété',    color: '#FF5C8A', icon: '🎵' }, // rose corail
  autres:      { label: 'Autres',     color: '#9D97B0', icon: '✨' }, // lavande-gris
}

export const ALL_GENRES = Object.keys(GENRE_CONFIG) as Genre[]
