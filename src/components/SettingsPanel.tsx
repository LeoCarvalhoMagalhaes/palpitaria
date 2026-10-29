import { Monitor, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useL, useSettings, type Lang, type ThemeChoice } from '@/core/settings'

const THEMES: { value: ThemeChoice; pt: string; en: string; icon: typeof Sun }[] = [
  { value: 'light', pt: 'Claro', en: 'Light', icon: Sun },
  { value: 'dark', pt: 'Escuro', en: 'Dark', icon: Moon },
  { value: 'system', pt: 'Sistema', en: 'System', icon: Monitor },
]

const LANGS: { value: Lang; label: string; flag: string }[] = [
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
]

function Choice({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2 text-sm font-semibold transition-colors ${
        checked ? 'border-brand bg-accent' : 'border-ink/15 hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function SettingsPanel() {
  const { settings, update } = useSettings()
  const L = useL()
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{L('Idioma', 'Language')}</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('Idioma', 'Language')}>
          {LANGS.map((l) => (
            <Choice key={l.value} checked={settings.lang === l.value} onClick={() => update({ lang: l.value })}>
              <span className="text-lg" aria-hidden>
                {l.flag}
              </span>
              {l.label}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{L('Tema', 'Theme')}</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={L('Tema', 'Theme')}>
          {THEMES.map(({ value, pt, en, icon: Icon }) => (
            <Choice key={value} checked={settings.theme === value} onClick={() => update({ theme: value })}>
              <Icon className="size-5" aria-hidden />
              {L(pt, en)}
            </Choice>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <strong className="block">{L('Alto contraste (daltônicos)', 'High contrast (color blind)')}</strong>
          <span className="text-muted-foreground">{L('Troca verde e amarelo por laranja e azul.', 'Swaps green and yellow for orange and blue.')}</span>
        </span>
        <Switch checked={settings.highContrast} onCheckedChange={(v) => update({ highContrast: v })} />
      </label>
    </div>
  )
}
