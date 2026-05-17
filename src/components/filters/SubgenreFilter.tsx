'use client'

import { useMemo, useState } from 'react'
import { Hash, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/event'

interface Props {
  selected: string[]
  onChange: (subgenres: string[]) => void
  events: Event[]
}

const SUGGESTIONS_MAX = 8

export function SubgenreFilter({ selected, onChange, events }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Frequency map: how many events have each subgenre, computed on the currently filtered set.
  // This makes the suggestions adaptive to the active genre filter (and other axes).
  const frequency = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) for (const sg of e.subgenres) map.set(sg, (map.get(sg) ?? 0) + 1)
    return map
  }, [events])

  const allTags = useMemo(() => {
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }))
  }, [frequency])

  const suggestions = allTags.slice(0, SUGGESTIONS_MAX)

  const filteredTags = useMemo(() => {
    if (!query.trim()) return allTags
    const q = query.toLowerCase().trim()
    return allTags.filter(({ tag }) => tag.toLowerCase().includes(q))
  }, [allTags, query])

  const toggle = (tag: string) => {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag))
    else onChange([...selected, tag])
  }

  const clear = () => onChange([])

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sous-genres</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-xs rounded-full gap-1 shrink-0"
      >
        <Hash className="w-3 h-3" />
        Plus de styles
        {selected.length > 0 && (
          <span className="ml-1 px-1.5 rounded-full bg-foreground text-background text-[10px] font-semibold">
            {selected.length}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pb-2">
            <SheetTitle>Plus de styles</SheetTitle>
            {selected.length > 0 && (
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
                Effacer ({selected.length})
              </button>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-4 py-2 pb-8">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un style…"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Suggestions (adaptive) */}
            {!query.trim() && suggestions.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggestions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(({ tag, count }) => {
                    const isActive = selected.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggle(tag)}
                        className={cn(
                          'flex items-center gap-1 px-2 h-7 text-xs rounded-full border transition-colors',
                          isActive
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-transparent border-border hover:bg-muted'
                        )}
                      >
                        <span>#{tag.replace(/\s+/g, '')}</span>
                        <span className={cn('text-[10px]', isActive ? 'opacity-70' : 'text-muted-foreground')}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* All tags */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {query.trim() ? `Résultats (${filteredTags.length})` : 'Tous les styles'}
              </h3>
              {filteredTags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Aucun style ne correspond.</p>
              ) : (
                <ul className="flex flex-col">
                  {filteredTags.map(({ tag, count }) => {
                    const isActive = selected.includes(tag)
                    return (
                      <li key={tag}>
                        <button
                          onClick={() => toggle(tag)}
                          className="w-full flex items-center justify-between py-2 px-1 text-sm hover:bg-muted rounded transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                                isActive ? 'bg-foreground border-foreground' : 'border-border'
                              )}
                            >
                              {isActive && <Check className="w-3 h-3 text-background" />}
                            </span>
                            <span className="capitalize">{tag}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{count}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
