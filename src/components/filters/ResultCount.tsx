interface Props { count: number }

export function ResultCount({ count }: Props) {
  return (
    <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
      {count} concert{count !== 1 ? 's' : ''}
    </span>
  )
}
