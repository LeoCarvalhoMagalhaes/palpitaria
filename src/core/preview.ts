/**
 * Áudio dos jogos de música:
 *  - a prévia oficial de 30 s da faixa vem do catálogo da Apple,
 *    buscada pelo ID na hora de tocar (a URL pode expirar, por isso não é guardada);
 *  - o arquivo é baixado e decodificado com Web Audio, e o trecho é tocado com início e duração
 *    exatos, sem depender de eventos de um player externo.
 */

export interface PreviewInfo {
  previewUrl: string
  trackViewUrl: string
  artworkUrl: string | null
  trackName: string
  artistName: string
}

const infoCache = new Map<number, Promise<PreviewInfo>>()
const bufferCache = new Map<number, Promise<AudioBuffer>>()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let masterLevel = 0.7

async function lookup(appleId: number, country: string): Promise<PreviewInfo | null> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${appleId}&country=${country}&entity=song`)
  if (!res.ok) throw new Error(`A Apple respondeu ${res.status}`)
  const json = await res.json()
  const r = json.results?.find((x: { previewUrl?: string }) => x.previewUrl)
  if (!r) return null
  return {
    previewUrl: r.previewUrl,
    trackViewUrl: r.trackViewUrl,
    artworkUrl: r.artworkUrl100 ? String(r.artworkUrl100).replace('100x100bb', '300x300bb') : null,
    trackName: r.trackName,
    artistName: r.artistName,
  }
}

/** Dados da prévia (URL, link da loja e capa). Tenta a loja dos EUA e depois a do Brasil. */
export function getPreview(appleId: number): Promise<PreviewInfo> {
  let p = infoCache.get(appleId)
  if (!p) {
    p = (async () => {
      const info = (await lookup(appleId, 'US')) ?? (await lookup(appleId, 'BR'))
      if (!info) throw new Error('Esta música está sem prévia no momento.')
      return info
    })()
    p.catch(() => infoCache.delete(appleId))
    infoCache.set(appleId, p)
  }
  return p
}

function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

/** Saída comum a todos os trechos: o volume passa por aqui. */
function output(c: AudioContext): GainNode {
  if (!master) {
    master = c.createGain()
    master.gain.value = masterLevel
    master.connect(c.destination)
  }
  return master
}

/** Volume geral (0 a 100), aplicado na hora, inclusive ao trecho que está tocando. */
export function setVolume(volume: number): void {
  masterLevel = Math.max(0, Math.min(1, volume / 100))
  if (master && ctx) master.gain.setTargetAtTime(masterLevel, ctx.currentTime, 0.02)
}

/** No iPhone, o modo silencioso cala o Web Audio, a não ser que a sessão seja de reprodução (Safari 17+). */
function playbackSession(): void {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (session && session.type !== 'playback') session.type = 'playback'
}

/**
 * Libera o som. Precisa ser chamado de dentro de um clique/toque (regra dos navegadores);
 * depois disso o contexto continua liberado, mesmo que o arquivo termine de baixar mais tarde.
 */
export function unlockAudio(): void {
  playbackSession()
  const c = audioContext()
  // "interrupted" acontece no Safari depois de uma ligação ou de trocar de app.
  if (c.state !== 'running') void c.resume()
}

/** Baixa e decodifica a prévia (fica em cache). Chame com antecedência para tocar sem espera. */
export function loadClip(appleId: number): Promise<AudioBuffer> {
  let p = bufferCache.get(appleId)
  if (!p) {
    p = (async () => {
      const info = await getPreview(appleId)
      const res = await fetch(info.previewUrl)
      if (!res.ok) throw new Error('Não foi possível baixar a prévia.')
      const data = await res.arrayBuffer()
      return await audioContext().decodeAudioData(data)
    })()
    p.catch(() => bufferCache.delete(appleId))
    bufferCache.set(appleId, p)
  }
  return p
}

const FADE = 0.012

/** Toca um trecho por vez. */
export class ClipPlayer {
  private source: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private onEnd: (() => void) | null = null
  private token = 0

  /**
   * Toca de `startMs` até `startMs + durationMs` (limitado ao fim da prévia) e chama `onEnd` ao terminar.
   * Chame a partir de um clique. Resolve quando o som começa.
   */
  async play(appleId: number, startMs: number, durationMs: number, volume: number, onEnd?: () => void): Promise<void> {
    unlockAudio()
    this.stop(false)
    const token = ++this.token
    const buffer = await loadClip(appleId)
    if (token !== this.token) return
    const c = audioContext()
    if (c.state !== 'running') await c.resume()
    const start = Math.min(startMs / 1000, Math.max(0, buffer.duration - 0.5))
    const duration = Math.min(durationMs / 1000, buffer.duration - start)
    const source = c.createBufferSource()
    source.buffer = buffer
    const gain = c.createGain()
    setVolume(volume)
    const level = 1
    const t0 = c.currentTime + 0.02
    // Rampas curtas evitam o "estalo" no começo e no fim do trecho.
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(level, t0 + Math.min(FADE, duration / 4))
    gain.gain.setValueAtTime(level, t0 + Math.max(0, duration - FADE))
    gain.gain.linearRampToValueAtTime(0, t0 + duration)
    source.connect(gain).connect(output(c))
    this.source = source
    this.gain = gain
    this.onEnd = onEnd ?? null
    source.onended = () => {
      if (this.source === source) {
        this.source = null
        const cb = this.onEnd
        this.onEnd = null
        cb?.()
      }
    }
    source.start(t0, start, duration)
  }

  stop(notify = true) {
    this.token++
    const s = this.source
    this.source = null
    const cb = this.onEnd
    this.onEnd = null
    if (s) {
      try {
        s.onended = null
        s.stop()
        s.disconnect()
        this.gain?.disconnect()
      } catch {
        // já parado
      }
      if (notify) cb?.()
    }
  }

  get playing(): boolean {
    return this.source !== null
  }
}

export const appleMusicUrl = (info: PreviewInfo) => info.trackViewUrl
