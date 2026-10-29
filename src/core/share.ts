import { toast } from 'sonner'
import { SITE_URL } from '@/config/games'

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** No celular abre o compartilhamento nativo; no computador copia o texto. */
export async function shareResult(text: string, L: <T>(pt: T, en: T) => T = (pt) => pt, withUrl = true): Promise<void> {
  const full = withUrl ? `${text}\n${SITE_URL}` : text
  if (isMobile() && navigator.share) {
    try {
      await navigator.share({ text: full })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(full)
    toast.success(L('Copiado! Agora é só colar onde quiser.', 'Copied! Paste it wherever you like.'))
  } catch {
    toast.error(L('Não deu para copiar. Selecione o texto e copie manualmente.', "Couldn't copy. Select the text and copy it manually."))
  }
}
