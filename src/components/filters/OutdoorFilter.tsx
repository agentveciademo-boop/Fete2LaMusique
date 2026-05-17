'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { OutdoorFilter as OutdoorFilterType } from '@/hooks/useFilters'

interface Props {
  value: OutdoorFilterType
  onChange: (v: OutdoorFilterType) => void
}

export function OutdoorFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lieu</span>
      <ToggleGroup
        value={[value]}
        onValueChange={v => onChange(((v as string[])[v.length - 1] || 'all') as OutdoorFilterType)}
        className="flex gap-1"
      >
        <ToggleGroupItem value="all"     className="h-7 px-3 text-xs rounded-full">Tout</ToggleGroupItem>
        <ToggleGroupItem value="outdoor" className="h-7 px-3 text-xs rounded-full">🌳 Plein air</ToggleGroupItem>
        <ToggleGroupItem value="indoor"  className="h-7 px-3 text-xs rounded-full">🏠 En salle</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
