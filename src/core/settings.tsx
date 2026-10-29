import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readJSON, writeJSON } from './storage'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type Lang = 'pt' | 'en'

export interface Settings {
  theme: ThemeChoice
  highContrast: boolean
  units: 'km' | 'mi'
  volume: number
  lang: Lang
}

function defaultLang(): Lang {
  if (typeof navigator === 'undefined') return 'pt'
  return (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

const DEFAULTS: Omit<Settings, 'lang'> = { theme: 'system', highContrast: false, units: 'km', volume: 70 }

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  resolvedTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, lang: defaultLang(), ...readJSON('settings', {}) }))
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.classList.toggle('hc', settings.highContrast)
    root.lang = settings.lang === 'en' ? 'en' : 'pt-BR'
  }, [resolvedTheme, settings.highContrast, settings.lang])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme,
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch }
          writeJSON('settings', next)
          return next
        }),
    }),
    [settings, resolvedTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings fora do SettingsProvider')
  return ctx
}

export function useLang(): Lang {
  return useSettings().settings.lang
}

/** Escolhe o texto do idioma atual: L('texto em português', 'English text'). */
export function useL(): <T>(pt: T, en: T) => T {
  const lang = useLang()
  return useCallback(<T,>(pt: T, en: T) => (lang === 'en' ? en : pt), [lang])
}
