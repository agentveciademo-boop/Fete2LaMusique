'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Layers, Clock, Radar, Heart, type LucideIcon } from 'lucide-react'

// Barre d'onglets basse — l'ossature qui relie les 5 écrans de la refonte.
// 3 onglets pour planifier (avant le 21, chez soi) + 2 pour le live (le soir, dans la rue).
// Réf. design : BottomNav dans shared.jsx + schéma NavIA.
const TABS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/carte',     label: 'Carte',     Icon: Map },
  { href: '/decouvrir', label: 'Découvrir', Icon: Layers },
  { href: '/programme', label: 'Programme', Icon: Clock },
  { href: '/autour',    label: 'Autour',    Icon: Radar },
  { href: '/ma-soiree', label: 'Ma soirée', Icon: Heart },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav
      className="flex shrink-0 items-start justify-around border-t border-white/10 px-1.5 pt-2.5 backdrop-blur-xl"
      style={{
        background: 'rgba(11,9,19,.94)',
        paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const on = path === href || path.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1"
            style={{ color: on ? 'var(--glow)' : 'var(--muted)' }}
          >
            <Icon
              size={22}
              strokeWidth={on ? 2.2 : 1.9}
              style={{ filter: on ? 'drop-shadow(0 0 7px var(--glow))' : 'none' }}
            />
            <span style={{ fontSize: 9.5, fontWeight: on ? 700 : 500, letterSpacing: '.1px', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
