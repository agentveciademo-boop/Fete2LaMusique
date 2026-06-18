'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Flame, Clock, Radar, Heart, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

const TAB_HREFS: { href: string; Icon: LucideIcon; key: 'navCarte' | 'navAffluence' | 'navProgramme' | 'navAutour' | 'navMaSoiree' }[] = [
  { href: '/',          Icon: Flame,  key: 'navAffluence' },
  { href: '/carte',     Icon: Map,    key: 'navCarte'     },
  { href: '/programme', Icon: Clock,  key: 'navProgramme' },
  { href: '/autour',    Icon: Radar,  key: 'navAutour'    },
  { href: '/ma-soiree', Icon: Heart,  key: 'navMaSoiree'  },
]

export function BottomNav() {
  const path = usePathname()
  const { t } = useTranslation()
  return (
    <nav
      className="flex shrink-0 items-start justify-around border-t border-white/10 px-1.5 pt-2.5 backdrop-blur-xl"
      style={{
        background: 'rgba(11,9,19,.94)',
        paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
      }}
    >
      {TAB_HREFS.map(({ href, Icon, key }) => {
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
              {t[key]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
