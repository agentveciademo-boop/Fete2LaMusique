import Link from 'next/link'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Juin 2026 : le 1er tombe un lundi → aucune case vide en tête. 30 jours.
const FIRST_WEEKDAY_OFFSET = 0
const DAYS_IN_MONTH = 30

// Cellules de la grille : décalage de tête + jours du mois, complété pour finir la semaine.
const cells: (number | null)[] = [
  ...Array.from({ length: FIRST_WEEKDAY_OFFSET }, () => null),
  ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
]
while (cells.length % 7 !== 0) cells.push(null)

export default function PlanningPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-[#0d0d0f] bg-linear-to-b from-[#0d0d0f] via-[#0d0d0f] to-[#160e10] px-4 py-12 sm:px-6">
      <div className="w-full max-w-4xl">
        <header className="mb-8 text-center">
          <span className="mb-4 block text-4xl" aria-hidden>📅</span>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Planning — Juin 2026
          </h1>
          <p className="mt-2 text-neutral-400">
            Du lundi 1<sup>er</sup> au mardi 30 juin · cases à remplir
          </p>
        </header>

        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-xl bg-[#26262e]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="bg-[#16161b] py-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-xl bg-[#26262e]">
          {cells.map((day, i) => (
            <div
              key={i}
              className={
                day === null
                  ? 'min-h-20 bg-[#0d0d0f] sm:min-h-28'
                  : 'min-h-20 bg-[#16161b] p-1.5 sm:min-h-28'
              }
            >
              {day !== null && (
                <span
                  className={
                    day === 21
                      ? 'text-sm font-bold text-[#FF6B6B]'
                      : 'text-sm font-medium text-neutral-500'
                  }
                >
                  {day}
                </span>
              )}
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium text-[#FF6B6B] underline-offset-4 hover:underline"
        >
          ← Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}
