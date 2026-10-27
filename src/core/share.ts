import { toast } from 'sonner'
import { SITE_URL } from '@/config/games'

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** No celular abre o compartilhamento nativo; no computador copia o texto. */
export async function shareResult(text: string, withUrl = true): Promise<void> {
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
    toast.success('Copiado! Agora é só colar onde quiser.')
  } catch {
    toast.error('Não deu para copiar. Selecione o texto e copie manualmente.')
  }
}
