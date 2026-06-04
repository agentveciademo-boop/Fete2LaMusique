import type { Genre } from '@/types/event'

// Palette catégorielle pensée pour la distinction (pins camembert + pastilles de filtre).
// Couleurs assez foncées pour rester lisibles avec du texte blanc (badges). 16 genres =
// proche de la limite perceptive : les tons chauds (jazz/rap/fanfare/trad/soul-funk) sont
// volontairement séparés par la luminosité.
export const GENRE_CONFIG: Record<Genre, { label: string; color: string; icon: string }> = {
  rock:        { label: 'Rock',       color: '#E11D1D', icon: '🎸' }, // rouge vif
  rap:         { label: 'Rap',        color: '#EA6A0A', icon: '🎤' }, // orange
  jazz:        { label: 'Jazz',       color: '#D9A400', icon: '🎷' }, // or
  fanfare:     { label: 'Fanfare',    color: '#A67C00', icon: '🎺' }, // moutarde foncé
  trad:        { label: 'Trad',       color: '#B5651D', icon: '🪗' }, // terre cuite
  'soul-funk': { label: 'Soul/Funk',  color: '#7C4A22', icon: '🪩' }, // brun
  reggae:      { label: 'Reggae',     color: '#4CA72B', icon: '🌴' }, // vert clair
  folk:        { label: 'Folk',       color: '#15803D', icon: '🪕' }, // vert profond
  world:       { label: 'World',      color: '#0F8C7A', icon: '🌍' }, // sarcelle
  electro:     { label: 'Électro',    color: '#0EA5C4', icon: '🎧' }, // cyan
  blues:       { label: 'Blues',      color: '#1D4ED8', icon: '🎻' }, // bleu roi
  classique:   { label: 'Classique',  color: '#6D28D9', icon: '🎹' }, // violet profond
  chorale:     { label: 'Chorale',    color: '#9D4EDD', icon: '🎼' }, // violet clair
  pop:         { label: 'Pop',        color: '#E0218A', icon: '🎀' }, // rose vif
  variete:     { label: 'Variété',    color: '#BE185D', icon: '🎵' }, // rose profond
  autres:      { label: 'Autres',     color: '#6B7280', icon: '❓' }, // gris ardoise
}

export const ALL_GENRES = Object.keys(GENRE_CONFIG) as Genre[]
