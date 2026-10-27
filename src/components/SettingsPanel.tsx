import { Monitor, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings, type ThemeChoice } from '@/core/settings'

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function SettingsPanel() {
  const { settings, update } = useSettings()
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tema</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.theme === value}
              onClick={() => update({ theme: value })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2 text-sm font-semibold transition-colors ${
                settings.theme === value ? 'border-brand bg-accent' : 'border-ink/15 hover:bg-muted'
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <strong className="block">Alto contraste (daltônicos)</strong>
          <span className="text-muted-foreground">Troca verde e amarelo por laranja e azul.</span>
        </span>
        <Switch checked={settings.highContrast} onCheckedChange={(v) => update({ highContrast: v })} />
      </label>
    </div>
  )
}
