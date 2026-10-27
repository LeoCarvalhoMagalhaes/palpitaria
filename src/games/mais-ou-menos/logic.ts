import { seededRandom } from '@/core/daily'

export const ROUNDS = 5
export const WIN_SCORE = 3
/** O maior valor precisa ser pelo menos 15% maior: evita empates "na unha". */
export const MIN_RATIO = 1.15

export interface Item {
  name: string
  value: number
  emoji: string
  /** Em "Curiosidades", o tipo de comparação (só compara itens do mesmo grupo). */
  group?: string
}

export interface Category {
  id: string
  name: string
  question: string
  unit: string
  prefix?: string
  decimals?: number
  items: Item[]
  groups?: Record<string, { question: string; unit: string }>
  fonte: string
  licenca: string
  url: string
}

export interface Round {
  category: Category
  left: Item
  right: Item
  question: string
  unit: string
}

export function displayName(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

/** Sorteia, para cada categoria, um par com valores bem diferentes. Mesma data, mesmo par. */
export function dailyRounds(categories: Category[], number: number): Round[] {
  return categories.slice(0, ROUNDS).map((category) => {
    const rand = seededRandom(`mais-ou-menos:${category.id}:${number}`)
    let pool = category.items
    let question = category.question
    let unit = category.unit
    if (category.groups) {
      const keys = Object.keys(category.groups)
      const g = keys[Math.floor(rand() * keys.length)]
      pool = category.items.filter((i) => i.group === g)
      question = category.groups[g].question
      unit = category.groups[g].unit
    }
    for (let attempt = 0; attempt < 300; attempt++) {
      const a = pool[Math.floor(rand() * pool.length)]
      const b = pool[Math.floor(rand() * pool.length)]
      if (a === b || a.name === b.name) continue
      const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value)
      if (ratio >= MIN_RATIO) return { category, left: a, right: b, question, unit }
    }
    const sorted = [...pool].sort((x, y) => x.value - y.value)
    return { category, left: sorted[0], right: sorted[sorted.length - 1], question, unit }
  })
}

export function isRight(round: Pick<Round, 'left' | 'right'>, choice: 'left' | 'right'): boolean {
  const chosen = round[choice]
  const other = choice === 'left' ? round.right : round.left
  return chosen.value > other.value
}

export function formatValue(value: number, unit: string, prefix = '', decimals = 0): string {
  const n = value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${prefix}${n}${unit ? ` ${unit}` : ''}`
}

export function shareText(name: string, number: number, results: boolean[]): string {
  const score = results.filter(Boolean).length
  return `${name} #${number} ${score}/${ROUNDS}\n${results.map((r) => (r ? '✅' : '❌')).join('')}`
}
