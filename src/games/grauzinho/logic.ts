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

export const WARMTH: { under: number; label: string }[] = [
  { under: 10, label: 'Fervendo! 🔥' },
  { under: 20, label: 'Quente!' },
  { under: 35, label: 'Esquentando' },
  { under: 60, label: 'Morno' },
  { under: 100, label: 'Frio!' },
  { under: Infinity, label: 'Congelando! 🥶' },
]

export function warmthLabel(diff: number): string {
  const abs = Math.abs(diff)
  return WARMTH.find((w) => abs < w.under)!.label
}

export interface GuessFeedback {
  value: number
  delta: number
  direction: Direction
  label: string
}

export function evaluateGuess(value: number, answer: number): GuessFeedback {
  const delta = answer - value
  if (delta === 0) return { value, delta, direction: 'solved', label: 'Na mosca! 🎯' }
  return { value, delta, direction: delta > 0 ? 'up' : 'down', label: warmthLabel(delta) }
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
export function evaluateConstruct(produced: number, target: number) {
  const diff = target - produced
  const solved = Math.abs(diff) <= CONSTRUCT_TOLERANCE
  return {
    produced,
    solved,
    hint: solved ? 'Construiu! 🎉' : diff > 0 ? 'Abra mais' : 'Feche mais',
    label: solved ? '' : warmthLabel(diff),
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
  const bonus = construct ? ` · Bônus: ${construct.solved ? `feito em ${construct.attempts}` : 'não feito'}` : ''
  return [head + bonus, ...guesses.map(shareLine)].join('\n')
}
