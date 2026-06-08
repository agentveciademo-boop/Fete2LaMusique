import type { Genre } from '@/types/event'
import { genreColor } from '@/lib/view'

// Pastille de genre lumineuse (« lumière de la ville ») — réf. design shared.jsx.
// Le halo (box-shadow coloré) rappelle l'effet glow des pins de la carte.
export function GenreDot({ g, size = 10, glow = true }: { g: Genre; size?: number; glow?: boolean }) {
  const c = genreColor(g)
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: c,
        display: 'inline-block',
        flex: '0 0 auto',
        boxShadow: glow ? `0 0 ${size}px ${c}, 0 0 2px ${c}` : 'none',
      }}
    />
  )
}
