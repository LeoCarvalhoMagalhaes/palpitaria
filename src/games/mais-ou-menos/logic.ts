import { seededRandom } from '@/core/daily'

export const ROUNDS = 5
export const WIN_SCORE = 3
/** O maior valor precisa ser pelo menos 15% maior: evita empates "na unha". */
export const MIN_RATIO = 1.15

export interface Item {
  name: string
  value: number
  emoji: string
}

export interface Category {
  id: string
  name: string
  question: string
  unit: string
  items: Item[]
  fonte: string
  licenca: string
  url: string
}

export interface Round {
  category: Category
  left: Item
  right: Item
}

export function displayName(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

/** Sorteia, para cada categoria, um par com valores bem diferentes. Mesma data, mesmo par. */
export function dailyRounds(categories: Category[], number: number): Round[] {
  return categories.slice(0, ROUNDS).map((category) => {
    const rand = seededRandom(`mais-ou-menos:${category.id}:${number}`)
    const items = category.items
    for (let attempt = 0; attempt < 200; attempt++) {
      const a = items[Math.floor(rand() * items.length)]
      const b = items[Math.floor(rand() * items.length)]
      if (a === b || a.name === b.name) continue
      const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value)
      if (ratio >= MIN_RATIO) return { category, left: a, right: b }
    }
    return { category, left: items[0], right: items[items.length - 1] }
  })
}

export function isRight(round: Round, choice: 'left' | 'right'): boolean {
  const chosen = round[choice]
  const other = choice === 'left' ? round.right : round.left
  return chosen.value > other.value
}

export function formatValue(value: number, unit: string): string {
  return `${value.toLocaleString('pt-BR')} ${unit}`
}

export function shareText(name: string, number: number, results: boolean[]): string {
  const score = results.filter(Boolean).length
  return `${name} #${number} ${score}/${ROUNDS}\n${results.map((r) => (r ? '✅' : '❌')).join('')}`
}
