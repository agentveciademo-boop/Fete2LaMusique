import type { Genre } from '@/types/event'

// Palette catégorielle rééquilibrée (v2, 2026-06-05) : teintes réparties sur toute la roue
// chromatique, genres les plus fréquents (electro/soul-funk/pop/rock/classique/variété) les
// plus écartés. La bande jaune/or (~40–58°) est volontairement LAISSÉE LIBRE — elle est
// réservée au signal « Sur réservation » (halo + anneau jaune des pins). Couleurs assez
// foncées pour rester lisibles avec du texte blanc.
export const GENRE_CONFIG: Record<Genre, { label: string; color: string; icon: string }> = {
  rock:        { label: 'Rock',       color: '#CE2222', icon: '🎸' }, // rouge
  rap:         { label: 'Rap',        color: '#D56610', icon: '🎤' }, // orange
  jazz:        { label: 'Jazz',       color: '#8E9711', icon: '🎷' }, // or-olive (hors bande jaune)
  fanfare:     { label: 'Fanfare',    color: '#588820', icon: '🎺' }, // vert-olive
  trad:        { label: 'Trad',       color: '#925D1C', icon: '🥁' }, // terre cuite
  'soul-funk': { label: 'Soul/Funk',  color: '#A734B2', icon: '🕺' }, // magenta (disco)
  reggae:      { label: 'Reggae',     color: '#29994A', icon: '🌴' }, // vert
  folk:        { label: 'Folk',       color: '#328226', icon: '🌾' }, // vert profond
  world:       { label: 'World',      color: '#108E75', icon: '🌍' }, // sarcelle
  electro:     { label: 'Électro',    color: '#0F83BD', icon: '🎧' }, // cyan-azur
  blues:       { label: 'Blues',      color: '#1F43D6', icon: '🎻' }, // bleu roi
  classique:   { label: 'Classique',  color: '#6030CF', icon: '🎹' }, // violet profond
  chorale:     { label: 'Chorale',    color: '#A451C8', icon: '🎼' }, // violet clair
  pop:         { label: 'Pop',        color: '#D322A6', icon: '🎀' }, // magenta
  variete:     { label: 'Variété',    color: '#CA1C5B', icon: '🎵' }, // rose profond
  autres:      { label: 'Autres',     color: '#6B7280', icon: '❓' }, // gris ardoise
}

export const ALL_GENRES = Object.keys(GENRE_CONFIG) as Genre[]
