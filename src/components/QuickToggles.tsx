import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useL, useSettings } from '@/core/settings'

/** Botões rápidos do cabeçalho: modo escuro e idioma. */
export function QuickToggles() {
  const { settings, update, resolvedTheme } = useSettings()
  const L = useL()
  const dark = resolvedTheme === 'dark'
  const themeLabel = dark ? L('Usar modo claro', 'Switch to light mode') : L('Usar modo escuro', 'Switch to dark mode')
  const langLabel = settings.lang === 'en' ? 'Mudar para português' : 'Switch to English'
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label={themeLabel} onClick={() => update({ theme: dark ? 'light' : 'dark' })}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{themeLabel}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={langLabel}
            onClick={() => update({ lang: settings.lang === 'en' ? 'pt' : 'en' })}
            className="font-heading text-sm font-bold"
          >
            {settings.lang === 'en' ? 'PT' : 'EN'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{langLabel}</TooltipContent>
      </Tooltip>
    </>
  )
}
