/** Leitura em voz alta com a voz pt-BR do próprio aparelho (Web Speech API, sem custo e sem servidor). */

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function ptVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'pt-BR') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('pt-br')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('pt')) ??
    null
  )
}

export function hasPortugueseVoice(): boolean {
  return speechAvailable() && ptVoice() !== null
}

export function speak(text: string, rate = 0.9): void {
  if (!speechAvailable()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'pt-BR'
  u.rate = rate
  const voice = ptVoice()
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
