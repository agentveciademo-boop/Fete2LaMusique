'use client'

import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/i18n'

const LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
]

// Sélecteur de langue flottant (bouton Globe + menu déroulant). Réutilisé sur la carte
// ET l'écran Affluence. S'ouvre tout seul au premier chargement tant qu'aucune langue
// n'a été choisie (localStorage 'fm_lang').
export function LangSwitcher() {
  const { lang, setLang, t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Ouvrir le picker au premier chargement si aucune langue n'a encore été choisie.
  useEffect(() => {
    if (!localStorage.getItem('fm_lang')) setOpen(true)
  }, [])

  return (
    <>
      {/* Backdrop pour fermer le sélecteur au clic extérieur */}
      {open && <div className="fixed inset-0 z-[1]" onClick={() => setOpen(false)} />}

      <div className="relative">
        <button
          type="button"
          aria-label={t.langPickerTitle}
          onClick={() => setOpen(o => !o)}
          className="grid h-11 w-11 place-items-center rounded-[14px] text-[#0B0913]"
          style={{ background: 'var(--glow)', boxShadow: '0 0 20px rgba(255,92,138,.5)' }}
        >
          <Globe size={18} />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl border border-white/10 p-1.5 shadow-2xl backdrop-blur-xl"
            style={{ background: 'rgba(20,16,32,.96)', minWidth: '160px' }}
          >
            {LANG_OPTIONS.map(({ code, flag, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => { setLang(code); setOpen(false) }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                style={lang === code
                  ? { background: 'var(--glow)', color: '#0B0913' }
                  : { color: 'var(--paper)' }
                }
              >
                <span className="text-base">{flag}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
