import type { Genre } from '@/types/event'

export const GENRE_CONFIG: Record<Genre, { label: string; color: string; icon: string }> = {
  jazz:        { label: 'Jazz',       color: '#F59E0B', icon: '🎷' },
  rock:        { label: 'Rock',       color: '#EF4444', icon: '🎸' },
  classique:   { label: 'Classique',  color: '#8B5CF6', icon: '🎹' },
  electro:     { label: 'Électro',    color: '#06B6D4', icon: '🎧' },
  folk:        { label: 'Folk',       color: '#10B981', icon: '🪕' },
  rap:         { label: 'Rap',        color: '#F97316', icon: '🎤' },
  variete:     { label: 'Variété',    color: '#EC4899', icon: '🎵' },
  world:       { label: 'World',      color: '#14B8A6', icon: '🌍' },
  pop:         { label: 'Pop',        color: '#DB2777', icon: '🎀' },
  'soul-funk': { label: 'Soul/Funk',  color: '#B45309', icon: '🪩' },
  chorale:     { label: 'Chorale',    color: '#7C3AED', icon: '🎼' },
  reggae:      { label: 'Reggae',     color: '#16A34A', icon: '🌴' },
  fanfare:     { label: 'Fanfare',    color: '#CA8A04', icon: '🎺' },
  trad:        { label: 'Trad',       color: '#92400E', icon: '🪗' },
  blues:       { label: 'Blues',      color: '#1E40AF', icon: '🎻' },
  autres:      { label: 'Autres',     color: '#6B7280', icon: '❓' },
}

export const ALL_GENRES = Object.keys(GENRE_CONFIG) as Genre[]
