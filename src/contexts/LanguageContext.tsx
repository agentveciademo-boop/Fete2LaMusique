'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { type Lang, translations } from '@/lib/i18n'

interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (typeof translations)[Lang]
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'fr',
  setLang: () => {},
  t: translations.fr,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('fm_lang') as Lang | null
    if (saved && saved in translations) setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('fm_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
