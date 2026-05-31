import Link from 'next/link'

// Boutons de la page d'accueil. Ajouter une entrée ici suffit à créer un nouveau bouton.
const LINKS = [
  {
    href: '/carte',
    emoji: '🗺️',
    title: 'App',
    description: 'La carte interactive des concerts du 21 juin à Paris.',
  },
  {
    href: '/strategie',
    emoji: '🎯',
    title: 'Stratégie',
    description: 'La vision, le positionnement et la ligne du projet.',
  },
  {
    href: '/planning',
    emoji: '📅',
    title: 'Planning',
    description: 'Le planning de la semaine et la route vers le 21 juin.',
  },
]

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#0d0d0f] bg-linear-to-b from-[#0d0d0f] via-[#0d0d0f] to-[#160e10] px-6 py-16 text-center">
      <span className="mb-6 text-5xl" aria-hidden>🎶</span>

      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Fête de la Musique
      </h1>
      <p className="mt-3 text-lg text-neutral-400">
        Paris · 21 juin 2026
      </p>

      <div className="mt-12 flex w-full max-w-2xl flex-wrap justify-center gap-5">
        {LINKS.map(({ href, emoji, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group w-full rounded-2xl border border-[#26262e] bg-[#16161b] p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#FF6B6B] hover:bg-[#1d1d24] hover:shadow-lg sm:w-72"
          >
            <span className="text-3xl" aria-hidden>{emoji}</span>
            <h2 className="mt-4 text-xl font-semibold text-[#FF6B6B]">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              {description}
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-16 text-xs text-neutral-600">
        fete2lamusique.paname.ai
      </footer>
    </main>
  )
}
