import { pickDaily } from '@/core/daily'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export type LetterState = 'hit' | 'near' | 'miss'

export function fold(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Avalia um palpite tratando letras repetidas como no outro jogo: amarelos limitados às ocorrências restantes. */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const g = fold(guess).split('')
  const a = fold(answer).split('')
  const result: LetterState[] = g.map(() => 'miss')
  const remaining: Record<string, number> = {}
  g.forEach((ch, i) => {
    if (ch === a[i]) result[i] = 'hit'
    else remaining[a[i]] = (remaining[a[i]] ?? 0) + 1
  })
  g.forEach((ch, i) => {
    if (result[i] === 'hit') return
    if (remaining[ch]) {
      result[i] = 'near'
      remaining[ch] -= 1
    }
  })
  return result
}

/** Modo difícil: letras verdes ficam no lugar e amarelas precisam ser usadas. Retorna o erro ou null. */
export function hardModeViolation(guess: string, previous: { word: string; score: LetterState[] }[], lang: 'pt' | 'en' = 'pt'): string | null {
  const g = fold(guess)
  for (const prev of previous) {
    const p = fold(prev.word)
    for (let i = 0; i < p.length; i++) {
      if (prev.score[i] === 'hit' && g[i] !== p[i]) return lang === 'en' ? `Letter ${i + 1} must be ${p[i].toUpperCase()}` : `A ${i + 1}ª letra precisa ser ${p[i].toUpperCase()}`
    }
    const needed: Record<string, number> = {}
    prev.score.forEach((s, i) => {
      if (s !== 'miss') needed[p[i]] = (needed[p[i]] ?? 0) + 1
    })
    for (const [ch, count] of Object.entries(needed)) {
      if (g.split('').filter((c) => c === ch).length < count) return lang === 'en' ? `Your guess must contain ${ch.toUpperCase()}` : `O palpite precisa ter a letra ${ch.toUpperCase()}`
    }
  }
  return null
}

/** Estado de cada tecla: o melhor resultado já visto para a letra. */
export function keyboardStates(guesses: { word: string; score: LetterState[] }[]): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { miss: 0, near: 1, hit: 2 }
  const out: Record<string, LetterState> = {}
  for (const { word, score } of guesses) {
    fold(word)
      .split('')
      .forEach((ch, i) => {
        if (!out[ch] || rank[score[i]] > rank[out[ch]]) out[ch] = score[i]
      })
  }
  return out
}

export function dailyAnswer(answers: string[], number: number): string {
  return pickDaily(answers, number, 'palavreta')
}

const EMOJI: Record<LetterState, string> = { hit: '🟩', near: '🟨', miss: '🟥' }

export function shareText(name: string, label: string, scores: LetterState[][], won: boolean, mode: string): string {
  const head = `${name} ${label} ${won ? scores.length : 'X'}/${MAX_GUESSES}${mode ? ` · ${mode}` : ''}`
  return [head, ...scores.map((s) => s.map((x) => EMOJI[x]).join(''))].join('\n')
}

/** Desafio personalizado: a palavra vai na URL de forma não legível à primeira vista. */
export function encodeChallenge(word: string): string {
  const bytes = fold(word)
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (7 + i)))
    .join('')
  return btoa(bytes).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function decodeChallenge(code: string): string | null {
  try {
    const raw = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
    const word = raw
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (7 + i)))
      .join('')
    return /^[a-z]{5}$/.test(word) ? word : null
  } catch {
    return null
  }
}
