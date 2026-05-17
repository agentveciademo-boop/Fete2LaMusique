import { ResultCount } from './filters/ResultCount'

interface Props { filteredCount: number }

export function Header({ filteredCount }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-white/70 dark:bg-black/70 backdrop-blur border-b border-white/20">
      <span className="font-bold text-base">🎵 Fête de la Musique · Paris 2026</span>
      <div className="hidden md:block">
        <ResultCount count={filteredCount} />
      </div>
    </header>
  )
}
