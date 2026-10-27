/**
 * Player oficial do Spotify (Embed + IFrame API: https://developer.spotify.com/documentation/embeds),
 * a mesma técnica do projeto outro projeto. Sem login no Spotify o embed toca a prévia de 30 s;
 * com login, a faixa completa. Durante o jogo o player fica fora da tela (para não revelar o título);
 * no fim, o embed visível aparece com a faixa.
 *
 * Atenção: a Developer Policy do Spotify proíbe jogos e quizzes ("name that tune"). O uso aqui foi
 * uma decisão consciente do dono do projeto, que assumiu o risco (ver docs/DECISOES.md).
 */

interface PlaybackUpdate {
  data: { position: number; duration: number; isPaused: boolean; isBuffering: boolean }
}

interface EmbedController {
  loadUri(uri: string): void
  play(): void
  pause(): void
  resume(): void
  seek(seconds: number): void
  destroy(): void
  addListener(event: 'ready', cb: () => void): void
  addListener(event: 'playback_update', cb: (e: PlaybackUpdate) => void): void
  removeListener(event: string): void
}

interface IFrameAPI {
  createController(el: HTMLElement, options: { uri: string; width?: string | number; height?: number }, cb: (c: EmbedController) => void): void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void
  }
}

const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1'
let apiPromise: Promise<IFrameAPI> | null = null

export function loadSpotifyApi(timeoutMs = 15000): Promise<IFrameAPI> {
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        apiPromise = null
        reject(new Error('O player do Spotify não respondeu. Verifique a conexão.'))
      }, timeoutMs)
      window.onSpotifyIframeApiReady = (api) => {
        window.clearTimeout(timer)
        resolve(api)
      }
      const s = document.createElement('script')
      s.src = API_SRC
      s.async = true
      s.onerror = () => {
        window.clearTimeout(timer)
        apiPromise = null
        reject(new Error('Não foi possível carregar o player do Spotify.'))
      }
      document.head.appendChild(s)
    })
  }
  return apiPromise
}

export const trackUri = (id: string) => `spotify:track:${id}`
export const trackUrl = (id: string) => `https://open.spotify.com/track/${id}`
export const embedUrl = (id: string) => `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`

/** Player oculto que toca trechos de faixas. Um por página de jogo. */
export class SnippetPlayer {
  private controller: EmbedController | null = null
  private host: HTMLDivElement
  private currentUri: string | null = null
  private stopTimer: number | null = null
  private onEnd: (() => void) | null = null
  private target: { startMs: number; endMs: number } | null = null
  private ready: Promise<void>

  constructor() {
    this.host = document.createElement('div')
    this.host.setAttribute('aria-hidden', 'true')
    this.host.style.cssText = 'position:fixed;left:-10000px;top:0;width:300px;height:80px;opacity:0;pointer-events:none'
    const slot = document.createElement('div')
    this.host.appendChild(slot)
    document.body.appendChild(this.host)
    this.ready = loadSpotifyApi().then(
      (api) =>
        new Promise<void>((resolve) => {
          api.createController(slot, { uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b', width: 300, height: 80 }, (c) => {
            this.controller = c
            c.addListener('ready', () => resolve())
            c.addListener('playback_update', (e) => this.onUpdate(e))
            window.setTimeout(resolve, 4000)
          })
        }),
    )
    // Quem chama play()/whenReady() recebe o erro; aqui só evita "rejeição não tratada".
    this.ready.catch(() => {})
  }

  whenReady(): Promise<void> {
    return this.ready
  }

  private onUpdate(e: PlaybackUpdate) {
    if (!this.target || e.data.isPaused || e.data.isBuffering) return
    if (e.data.position >= this.target.endMs) this.stop()
  }

  /** Toca de startMs até startMs + durationMs e chama onEnd ao parar. */
  async play(trackId: string, startMs: number, durationMs: number, onEnd?: () => void): Promise<void> {
    await this.ready
    const c = this.controller
    if (!c) throw new Error('Player do Spotify indisponível')
    this.stop(false)
    this.onEnd = onEnd ?? null
    this.target = { startMs, endMs: startMs + durationMs }
    const uri = trackUri(trackId)
    if (this.currentUri !== uri) {
      this.currentUri = uri
      c.loadUri(uri)
      await new Promise((r) => window.setTimeout(r, 600))
    }
    c.seek(startMs / 1000)
    c.play()
    // Garantia caso os eventos de progresso atrasem.
    this.stopTimer = window.setTimeout(() => this.stop(), durationMs + 3000)
  }

  stop(notify = true) {
    if (this.stopTimer) window.clearTimeout(this.stopTimer)
    this.stopTimer = null
    if (this.target) {
      this.target = null
      this.controller?.pause()
      if (notify) this.onEnd?.()
    }
    this.onEnd = null
  }

  destroy() {
    this.stop(false)
    this.controller?.destroy()
    this.host.remove()
  }
}
