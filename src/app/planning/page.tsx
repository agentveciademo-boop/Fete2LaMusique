import Link from 'next/link'

export default function PlanningPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#0d0d0f] bg-linear-to-b from-[#0d0d0f] via-[#0d0d0f] to-[#160e10] px-6 py-16 text-center">
      <span className="mb-6 text-5xl" aria-hidden>📅</span>

      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Planning
      </h1>
      <p className="mt-3 max-w-md text-lg text-neutral-400">
        Le planning de la semaine et la route vers le 21 juin. Contenu à venir.
      </p>

      <Link
        href="/"
        className="mt-12 text-sm font-medium text-[#FF6B6B] underline-offset-4 hover:underline"
      >
        ← Retour à l’accueil
      </Link>
    </main>
  )
}
