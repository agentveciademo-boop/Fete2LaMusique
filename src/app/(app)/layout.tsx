import { BottomNav } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Shell d'app à onglets : <main> plein écran + barre persistante en bas (réf. handoff §3).
// Les écrans (carte, decouvrir, programme, autour, ma-soiree) vivent sous ce groupe et
// héritent de la barre. Les pages hors groupe (/, /strategie, /planning) n'en ont pas.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div
        className="flex flex-col text-[var(--paper)]"
        style={{ height: '100dvh', background: 'var(--ink-900)' }}
      >
        <main className="relative flex-1 overflow-hidden">{children}</main>
        <BottomNav />
        <Toaster />
      </div>
    </LanguageProvider>
  )
}
