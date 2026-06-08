import Link from 'next/link'

const SECTIONS = [
  {
    emoji: '🎯',
    title: 'Le projet',
    body: 'Une carte gratuite de tous les concerts de la Fête de la Musique du 21 juin à Paris. Pas de pub, pas de compte à créer, pas de chichis : tu ouvres, tu trouves où aller kiffer.',
  },
  {
    emoji: '🛠️',
    title: 'Comment c’est fait',
    body: 'On le construit en public, en un mois, devant tout le monde. La ligne est simple et assumée : Claude pilote (vision, planning, organisation) et Mistral code. Du vibe coding, avec des outils d’IA français.',
  },
  {
    emoji: '👥',
    title: 'Qui',
    body: 'Tanguy a apporté l’idée et un premier prototype. Florian porte l’exécution : le dev, la carte et le partage de l’aventure au jour le jour.',
  },
  {
    emoji: '🤝',
    title: 'Notre engagement',
    body: 'Gratuit et le restera. Tes données sont respectées. Et zéro triche : pas de faux comptes, pas de chiffres gonflés. Des vrais gens, de la vraie musique.',
  },
]

export default function StrategiePage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-[#0d0d0f] bg-linear-to-b from-[#0d0d0f] via-[#0d0d0f] to-[#160e10] px-5 py-12 sm:px-6">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <span className="mb-4 block text-4xl" aria-hidden>🎶</span>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            La démarche
          </h1>
          <p className="mt-2 text-neutral-400">
            Pourquoi cette appli, et comment on la construit.
          </p>
        </header>

        <div className="space-y-4">
          {SECTIONS.map(({ emoji, title, body }) => (
            <section
              key={title}
              className="rounded-2xl border border-[#26262e] bg-[#16161b] p-6 text-left"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#FF6B6B]">
                <span aria-hidden>{emoji}</span>
                {title}
              </h2>
              <p className="mt-2 leading-relaxed text-neutral-300">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-[#FF6B6B] underline-offset-4 hover:underline"
          >
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
