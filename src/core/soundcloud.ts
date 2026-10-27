/**
 * Integração com o widget oficial do SoundCloud (https://developers.soundcloud.com/docs/api/html5-widget).
 * O áudio é sempre tocado pelo player oficial, direto dos servidores do SoundCloud: nada é baixado ou hospedado aqui.
 * Durante o jogo o player fica oculto (para não revelar o título); no fim, o player visível aparece com o crédito.
 */

export interface SCSound {
  id: number
  title?: string
  permalink_url?: string
  duration?: number
  user?: { username?: string }
  artwork_url?: string | null
}

interface SCWidget {
  bind(event: string, cb: (e?: { currentPosition: number }) => void): void
  unbind(event: string): void
  getSounds(cb: (sounds: SCSound[]) => void): void
  getCurrentSound(cb: (sound: SCSound | null) => void): void
  getCurrentSoundIndex(cb: (index: number) => void): void
  skip(index: number): void
  seekTo(ms: number): void
  play(): void
  pause(): void
  setVolume(volume: number): void
}

interface SCApi {
  Widget: ((el: HTMLIFrameElement) => SCWidget) & { Events: Record<string, string> }
}

declare global {
  interface Window {
    SC?: SCApi
  }
}

let apiPromise: Promise<SCApi> | null = null

export function loadWidgetApi(): Promise<SCApi> {
  if (window.SC?.Widget) return Promise.resolve(window.SC)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://w.soundcloud.com/player/api.js'
      s.async = true
      s.onload = () => (window.SC ? resolve(window.SC) : reject(new Error('API do SoundCloud indisponível')))
      s.onerror = () => {
        apiPromise = null
        reject(new Error('Não foi possível carregar o player do SoundCloud'))
      }
      document.head.appendChild(s)
    })
  }
  return apiPromise
}

export function widgetSrc(url: string, visible = false): string {
  const params = new URLSearchParams({
    url,
    auto_play: 'false',
    visual: 'false',
    show_artwork: visible ? 'true' : 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    buying: 'false',
    sharing: 'false',
    download: 'false',
  })
  return `https://w.soundcloud.com/player/?${params.toString()}`
}

export interface LoadedPlaylist {
  widget: SCWidget
  sounds: SCSound[]
  iframe: HTMLIFrameElement
  destroy: () => void
}

/** Carrega uma playlist num player oculto e devolve as faixas (só as que vieram com título). */
export async function loadPlaylist(url: string, timeoutMs = 20000): Promise<LoadedPlaylist> {
  const api = await loadWidgetApi()
  const iframe = document.createElement('iframe')
  iframe.allow = 'autoplay'
  iframe.title = 'Player do SoundCloud'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:0;opacity:0;pointer-events:none;border:0'
  iframe.src = widgetSrc(url)
  document.body.appendChild(iframe)
  const destroy = () => iframe.remove()
  const widget = api.Widget(iframe)
  try {
    const sounds = await new Promise<SCSound[]>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('O SoundCloud demorou demais para responder')), timeoutMs)
      widget.bind(api.Widget.Events.ERROR, () => {
        window.clearTimeout(timer)
        reject(new Error('A playlist do SoundCloud não está disponível'))
      })
      widget.bind(api.Widget.Events.READY, () => {
        // O widget completa os metadados aos poucos; espera um pouco para pegar a lista inteira.
        let tries = 0
        const poll = () => {
          widget.getSounds((list) => {
            const titled = list.filter((s) => s.title)
            tries += 1
            if ((titled.length === list.length && list.length > 0) || tries >= 8) {
              window.clearTimeout(timer)
              resolve(list)
            } else window.setTimeout(poll, 600)
          })
        }
        poll()
      })
    })
    return { widget, sounds, iframe, destroy }
  } catch (err) {
    destroy()
    throw err
  }
}

/** Toca um trecho de uma faixa da playlist e pausa sozinho no fim. */
export function playSnippet(
  pl: LoadedPlaylist,
  index: number,
  startMs: number,
  durationMs: number,
  volume: number,
  onEnd?: () => void,
): () => void {
  const api = window.SC!
  const { widget } = pl
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    widget.pause()
    widget.unbind(api.Widget.Events.PLAY_PROGRESS)
    onEnd?.()
  }
  widget.unbind(api.Widget.Events.PLAY_PROGRESS)
  widget.setVolume(volume)
  widget.getCurrentSoundIndex((current) => {
    if (current !== index) widget.skip(index)
    window.setTimeout(() => {
      widget.seekTo(startMs)
      widget.play()
      widget.bind(api.Widget.Events.PLAY_PROGRESS, (e) => {
        if (e && e.currentPosition >= startMs + durationMs) stop()
      })
      // Garantia caso o evento de progresso atrase.
      window.setTimeout(stop, durationMs + 2500)
    }, current !== index ? 400 : 0)
  })
  return stop
}

/** Separa "Artista - Música" quando o título vem nesse formato. */
export function splitTitle(sound: SCSound): { artist: string; song: string } {
  const title = (sound.title ?? '').replace(/\s*[[(][^\])]*(?:official|oficial|lyric|letra|clipe|video|vídeo|audio|áudio)[^\])]*[\])]/gi, '').trim()
  const parts = title.split(/\s+[-–—]\s+/)
  if (parts.length >= 2) return { artist: parts[0].trim(), song: parts.slice(1).join(' - ').trim() }
  return { artist: sound.user?.username ?? '', song: title }
}

export function soundLabel(sound: SCSound): string {
  const { artist, song } = splitTitle(sound)
  return artist ? `${artist} – ${song}` : song
}
