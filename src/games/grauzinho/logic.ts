import { seededRandom } from '@/core/daily'

export const MAX_GUESSES = 4
export const CONSTRUCT_ATTEMPTS = 3
export const CONSTRUCT_TOLERANCE = 5

export interface DailyAngle {
  /** Direção da primeira semirreta, em graus (0 = direita, sentido anti-horário). */
  start: number
  /** Ângulo-resposta, inteiro de 1 a 359, medido no sentido anti-horário a partir de `start`. */
  answer: number
}

/** Duas direções sorteadas com a data como semente. A resposta é sempre um inteiro. */
export function dailyAngle(date: string): DailyAngle {
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = attempt ? `#${attempt}` : ''
    const start = Math.round(seededRandom(`${date}${suffix}`)() * 360) % 360
    const end = seededRandom(`${date}-b${suffix}`)() * 360
    const answer = Math.round((((end - start) % 360) + 360) % 360)
    // Evita ângulos quase nulos ou quase completos, difíceis de enxergar.
    if (answer >= 5 && answer <= 355) return { start, answer }
  }
  return { start: 30, answer: 123 }
}

export type Direction = 'up' | 'down' | 'solved'

export type Lang = 'pt' | 'en'

export const WARMTH: { under: number; label: string; en: string }[] = [
  { under: 10, label: 'Fervendo! 🔥', en: 'Boiling! 🔥' },
  { under: 20, label: 'Quente!', en: 'Hot!' },
  { under: 35, label: 'Esquentando', en: 'Getting hot' },
  { under: 60, label: 'Morno', en: 'Warm' },
  { under: 100, label: 'Frio!', en: 'Cold!' },
  { under: Infinity, label: 'Congelando! 🥶', en: 'Freezing! 🥶' },
]

export function warmthLabel(diff: number, lang: Lang = 'pt'): string {
  const abs = Math.abs(diff)
  const w = WARMTH.find((x) => abs < x.under)!
  return lang === 'en' ? w.en : w.label
}

export interface GuessFeedback {
  value: number
  delta: number
  direction: Direction
  label: string
}

export function evaluateGuess(value: number, answer: number, lang: Lang = 'pt'): GuessFeedback {
  const delta = answer - value
  if (delta === 0) return { value, delta, direction: 'solved', label: lang === 'en' ? 'Bullseye! 🎯' : 'Na mosca! 🎯' }
  return { value, delta, direction: delta > 0 ? 'up' : 'down', label: warmthLabel(delta, lang) }
}

const SQUARE_BANDS = [
  { within: 5, squares: 4 },
  { within: 10, squares: 3 },
  { within: 20, squares: 2 },
  { within: 50, squares: 1 },
]

/** Quadrados preenchidos (de 5) no compartilhamento. */
export function filledSquares(delta: number): number {
  if (delta === 0) return 5
  const abs = Math.abs(delta)
  return SQUARE_BANDS.find((b) => abs < b.within)?.squares ?? 0
}

export function shareLine(fb: GuessFeedback): string {
  if (fb.direction === 'solved') return `🎉 ${'🟩'.repeat(5)}`
  const n = filledSquares(fb.delta)
  return `${fb.direction === 'up' ? '⬆️' : '⬇️'} ${'🟧'.repeat(n)}${'⬜'.repeat(5 - n)}`
}

/** Rodada bônus: o jogador gira a semirreta e "produz" um ângulo. */
export function evaluateConstruct(produced: number, target: number, lang: Lang = 'pt') {
  const diff = target - produced
  const solved = Math.abs(diff) <= CONSTRUCT_TOLERANCE
  const en = lang === 'en'
  return {
    produced,
    solved,
    /** Diferença absoluta em graus (0 = exato). */
    off: Math.abs(diff),
    hint: solved ? (en ? 'Nailed it! 🎉' : 'Construiu! 🎉') : diff > 0 ? (en ? 'Open it more' : 'Abra mais') : en ? 'Close it more' : 'Feche mais',
    label: solved ? '' : warmthLabel(diff, lang),
  }
}

export function shareText(
  shareName: string,
  number: number,
  guesses: GuessFeedback[],
  won: boolean,
  construct: { attempts: number; solved: boolean } | null,
): string {
  const head = `${shareName} #${number} ${won ? guesses.length : 'X'}/${MAX_GUESSES}`
  const bonus = construct ? ` · 📐 ${construct.solved ? `${construct.attempts}/${CONSTRUCT_ATTEMPTS}` : `X/${CONSTRUCT_ATTEMPTS}`}` : ''
  return [head + bonus, ...guesses.map(shareLine)].join('\n')
}
