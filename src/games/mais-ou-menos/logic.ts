import { seededRandom } from '@/core/daily'

/** Como no outro jogo: 5 categorias, 5 duelos em cada. */
export const CATEGORIES = 5
export const DUELS_PER_CATEGORY = 5
export const ROUNDS = CATEGORIES * DUELS_PER_CATEGORY
/** Acertando 15 de 25 (60%), o dia conta como vitória para a sequência. */
export const WIN_SCORE = 15
/** O maior valor precisa ser pelo menos 15% maior: evita empates "na unha". */
export const MIN_RATIO = 1.15

export type Lang = 'pt' | 'en'
export type CategoryIcon = 'search' | 'music' | 'film' | 'tag' | 'lightbulb'

export interface Item {
  name: string
  value: number
  emoji: string
  /** Em "Curiosidades", o tipo de comparação (só compara itens do mesmo grupo). */
  group?: string
  image?: { src: string; page: string } | null
  /** Músicas: a capa vem da Apple (lookup no navegador). */
  appleId?: number
}

export interface Category {
  id: string
  name: string
  icon: CategoryIcon
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
  /** Posição da categoria (0–4) e do duelo dentro dela (0–4). */
  categoryIndex: number
  duel: number
  left: Item
  right: Item
  question: string
  unit: string
}

export function displayName(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

/**
 * 25 duelos: 5 por categoria, sem repetir item dentro da mesma categoria.
 * Em "Curiosidades", cada duelo sorteia um tipo (população, área, cidades, montanhas ou rios).
 * Mesma data, mesmos duelos.
 */
export function dailyRounds(categories: Category[], number: number): Round[] {
  return categories.slice(0, CATEGORIES).flatMap((category, categoryIndex) => {
    const rand = seededRandom(`mais-ou-menos:${category.id}:${number}`)
    const used = new Set<string>()
    const rounds: Round[] = []
    for (let duel = 0; duel < DUELS_PER_CATEGORY; duel++) {
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
      const free = pool.filter((i) => !used.has(i.name))
      let pair: [Item, Item] | null = null
      for (let attempt = 0; attempt < 400 && !pair; attempt++) {
        const a = free[Math.floor(rand() * free.length)]
        const b = free[Math.floor(rand() * free.length)]
        if (a === b || a.name === b.name) continue
        if (Math.max(a.value, b.value) / Math.min(a.value, b.value) >= MIN_RATIO) pair = [a, b]
      }
      if (!pair) {
        const sorted = [...free].sort((x, y) => x.value - y.value)
        pair = [sorted[0], sorted[sorted.length - 1]]
      }
      used.add(pair[0].name)
      used.add(pair[1].name)
      rounds.push({ category, categoryIndex, duel, left: pair[0], right: pair[1], question, unit })
    }
    return rounds
  })
}

export function isRight(round: Pick<Round, 'left' | 'right'>, choice: 'left' | 'right'): boolean {
  const chosen = round[choice]
  const other = choice === 'left' ? round.right : round.left
  return chosen.value > other.value
}

export function formatValue(value: number, unit: string, prefix = '', decimals = 0, lang: Lang = 'pt'): string {
  const n = value.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const p = lang === 'en' && prefix.trim() === 'US$' ? '$' : prefix
  return `${p}${n}${unit ? ` ${unit}` : ''}`
}

/** Faixas do gráfico de distribuição (25 duelos não cabem em barras individuais). */
export const SCORE_BUCKETS = ['0–9', '10–14', '15–19', '20–24', '25']

export function scoreBucket(score: number): string {
  if (score >= 25) return '25'
  if (score >= 20) return '20–24'
  if (score >= 15) return '15–19'
  if (score >= 10) return '10–14'
  return '0–9'
}

const ICON_EMOJI: Record<CategoryIcon, string> = { search: '🔎', music: '🎧', film: '🎬', tag: '🏷️', lightbulb: '💡' }

export function categoryEmoji(icon: CategoryIcon): string {
  return ICON_EMOJI[icon] ?? '❓'
}

/** Grade 5×5: uma linha por categoria jogada, com o ícone dela. */
export function shareText(name: string, number: number, results: boolean[], icons: CategoryIcon[]): string {
  const score = results.filter(Boolean).length
  const lines = icons
    .map((icon, c) => ({ icon, row: results.slice(c * DUELS_PER_CATEGORY, (c + 1) * DUELS_PER_CATEGORY) }))
    .filter((l) => l.row.length > 0)
    .map((l) => `${categoryEmoji(l.icon)} ${l.row.map((r) => (r ? '🟩' : '🟥')).join('')}`)
  return `${name} #${number} ${score}/${ROUNDS}\n${lines.join('\n')}`
}
