/** Leitura em voz alta com a voz do próprio aparelho (Web Speech API, sem custo e sem servidor). */

export type SpeechLang = 'pt' | 'en'

const LOCALE: Record<SpeechLang, string> = { pt: 'pt-BR', en: 'en-US' }

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function voiceFor(lang: SpeechLang): SpeechSynthesisVoice | null {
  const locale = LOCALE[lang].toLowerCase()
  const base = locale.slice(0, 2)
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === locale) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(locale)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  )
}

export function hasVoice(lang: SpeechLang = 'pt'): boolean {
  return speechAvailable() && voiceFor(lang) !== null
}

export function speak(text: string, rate = 0.9, lang: SpeechLang = 'pt'): void {
  if (!speechAvailable()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = LOCALE[lang]
  u.rate = rate
  const voice = voiceFor(lang)
  if (voice) u.voice = voice
  synth.speak(u)
}

/** As vozes carregam de forma assíncrona em alguns navegadores. */
export function onVoicesReady(cb: () => void): () => void {
  if (!speechAvailable()) return () => {}
  const synth = window.speechSynthesis
  if (synth.getVoices().length) cb()
  synth.addEventListener('voiceschanged', cb)
  return () => synth.removeEventListener('voiceschanged', cb)
}
