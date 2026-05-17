'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { PriceFilter as PriceFilterType } from '@/hooks/useFilters'

interface Props {
  value: PriceFilterType
  onChange: (v: PriceFilterType) => void
}

export function PriceFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prix</span>
      <ToggleGroup
        value={[value]}
        onValueChange={v => onChange(((v as string[])[v.length - 1] || 'all') as PriceFilterType)}
        className="flex gap-1"
      >
        <ToggleGroupItem value="all"           className="h-7 px-3 text-xs rounded-full">Tout</ToggleGroupItem>
        <ToggleGroupItem value="free"          className="h-7 px-3 text-xs rounded-full">💸 Gratuit</ToggleGroupItem>
        <ToggleGroupItem value="free_or_libre" className="h-7 px-3 text-xs rounded-full">🪙 Prix libre inclus</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
