/**
 * Player oficial do Spotify (Embed + IFrame API: https://developer.spotify.com/documentation/embeds),
 * a mesma técnica do projeto outro projeto. Sem login no Spotify o embed toca a prévia de 30 s;
 * com login, a faixa completa.
 *
 * Como no outro projeto, o player é criado com a faixa real no clique do usuário e o play() é chamado
 * também no evento "ready" (os navegadores só liberam som a partir de um gesto). O iframe fica dentro
 * da tela (iframes de outro domínio fora da tela são "congelados" pelo Chrome), coberto por um cartão
 * para não revelar a música durante o jogo.
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
  togglePlay(): void
  seek(seconds: number): void
  destroy(): void
  addListener(event: 'ready', cb: () => void): void
  addListener(event: 'playback_update', cb: (e: PlaybackUpdate) => void): void
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
    apiPromise = new Promise<IFrameAPI>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('O player do Spotify não respondeu. Verifique a conexão.')), timeoutMs)
      window.onSpotifyIframeApiReady = (api) => {
        window.clearTimeout(timer)
        resolve(api)
      }
      const s = document.createElement('script')
      s.src = API_SRC
      s.async = true
      s.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('Não foi possível carregar o player do Spotify.'))
      }
      document.head.appendChild(s)
    }).catch((err) => {
      apiPromise = null
      throw err
    })
  }
  return apiPromise
}

export const trackUri = (id: string) => `spotify:track:${id}`
export const trackUrl = (id: string) => `https://open.spotify.com/track/${id}`
export const embedUrl = (id: string) => `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`

const log = (...args: unknown[]) => console.debug('[spotify]', ...args)

/**
 * Toca trechos de faixas num embed do Spotify montado dentro de `host` (um elemento visível na página,
 * que o jogo cobre com um cartão). Um por página de jogo.
 */
export class SnippetPlayer {
  private host: HTMLElement
  private controller: EmbedController | null = null
  private creating: Promise<EmbedController> | null = null
  private currentUri: string | null = null
  private pendingPlay = false
  private durationMs = 0
  private stopTimer: number | null = null
  private safetyTimer: number | null = null
  private onEnd: (() => void) | null = null
  private active = false

  constructor(host: HTMLElement) {
    this.host = host
    // Adianta o download da API (não toca nada).
    loadSpotifyApi().catch(() => {})
  }

  /** Enquanto true, ignora avisos com posição antiga (o seek/loadUri ainda não "pegou"). */
  private waitingReset = false

  private onUpdate = (e: PlaybackUpdate) => {
    const d = e?.data
    if (!d || !this.active || this.stopTimer !== null) return
    if (this.waitingReset) {
      if (d.position > 1500) return
      this.waitingReset = false
    }
    if (d.isPaused || d.isBuffering) return
    // O aviso diz quanto já tocou desde o começo da faixa: o corte acontece no tempo que falta.
    const played = Math.max(0, d.position)
    const remaining = this.durationMs - played
    log('tocando', { played, remaining })
    if (remaining <= 0) this.stop()
    else this.stopTimer = window.setTimeout(() => this.stop(), remaining)
  }

  private async ensureController(uri: string): Promise<EmbedController> {
    if (this.controller) return this.controller
    if (!this.creating) {
      this.creating = loadSpotifyApi().then(
        (api) =>
          new Promise<EmbedController>((resolve) => {
            const slot = document.createElement('div')
            this.host.replaceChildren(slot)
            api.createController(slot, { uri, width: '100%', height: 80 }, (c) => {
              this.controller = c
              this.currentUri = uri
              c.addListener('playback_update', this.onUpdate)
              c.addListener('ready', () => {
                log('ready', this.pendingPlay)
                if (this.pendingPlay) {
                  this.pendingPlay = false
                  c.play()
                }
              })
              resolve(c)
            })
          }),
      )
      this.creating.catch(() => (this.creating = null))
    }
    return this.creating
  }

  /** Toca o começo da faixa por `durationMs` e chama `onEnd` ao parar. Chame a partir de um clique. */
  async play(trackId: string, durationMs: number, onEnd?: () => void): Promise<void> {
    this.stop(false)
    const uri = trackUri(trackId)
    this.durationMs = durationMs
    this.onEnd = onEnd ?? null
    this.active = true
    this.pendingPlay = true
    const fresh = !this.controller
    const c = await this.ensureController(uri)
    this.waitingReset = !fresh
    if (this.currentUri !== uri) {
      log('loadUri', uri)
      this.currentUri = uri
      c.loadUri(uri)
      c.play()
    } else if (!fresh) {
      // Mesma faixa: volta para o começo antes de tocar.
      c.seek(0)
      c.play()
    } else {
      c.play()
    }
    // Se o som nunca começar (ex.: bloqueio do navegador), libera o botão.
    this.safetyTimer = window.setTimeout(() => {
      if (this.stopTimer === null) {
        log('sem som após 8 s')
        this.stop()
      }
    }, 8000 + durationMs)
  }

  stop(notify = true) {
    if (this.stopTimer !== null) window.clearTimeout(this.stopTimer)
    if (this.safetyTimer !== null) window.clearTimeout(this.safetyTimer)
    this.stopTimer = null
    this.safetyTimer = null
    this.pendingPlay = false
    if (this.active) {
      this.active = false
      try {
        this.controller?.pause()
      } catch {
        // já parado
      }
      if (notify) this.onEnd?.()
    }
    this.onEnd = null
  }

  destroy() {
    this.stop(false)
    try {
      this.controller?.destroy()
    } catch {
      // ignorado
    }
    this.host.replaceChildren()
  }
}
