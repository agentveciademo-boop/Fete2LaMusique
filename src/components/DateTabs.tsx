'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FESTIVAL_DAYS, SESSION_LABELS, type SessionDate } from '@/lib/festival'

interface Props {
  value: SessionDate | null
  onChange: (next: SessionDate | null) => void
}

type Tab = { key: SessionDate | null; label: string }

const TABS: Tab[] = [
  ...FESTIVAL_DAYS.map(d => ({ key: d as SessionDate, label: SESSION_LABELS[d] })),
  { key: null, label: 'Tout' },
]

export function DateTabs({ value, onChange }: Props) {
  return (
    <header
      role="banner"
      className="fixed top-0 left-0 right-0 z-50 h-[50px] bg-background/95 backdrop-blur border-b border-border flex items-center px-2 sm:px-4"
    >
      <Button
        size="icon"
        variant="ghost"
        aria-label="Menu"
        className="shrink-0 h-9 w-9"
      >
        <Menu className="w-5 h-5" />
      </Button>
      <nav
        role="tablist"
        aria-label="Soirée"
        className="ml-1 sm:ml-3 flex items-center gap-1 sm:gap-2 flex-1 justify-center sm:justify-start"
      >
        {TABS.map(tab => {
          const active = tab.key === value
          return (
            <button
              key={String(tab.key)}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={
                'relative h-[50px] px-3 sm:px-4 text-sm font-medium ' +
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                (active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={
                  'pointer-events-none absolute left-2 right-2 sm:left-3 sm:right-3 bottom-0 h-[2px] rounded-full ' +
                  'bg-foreground transition-all duration-200 ' +
                  (active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0')
                }
              />
            </button>
          )
        })}
      </nav>
    </header>
  )
}
