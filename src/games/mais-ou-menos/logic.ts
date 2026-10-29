import { seededRandom } from '@/core/daily'

/** Como no outro jogo: 5 categorias, 5 duelos em cada. */
export const CATEGORIES = 5
export const DUELS_PER_CATEGORY = 5
export const ROUNDS = CATEGORIES * DUELS_PER_CATEGORY
/** Acertando 15 de 25 (60%), o dia conta como vitória para a sequência. */
export const WIN_SCORE = 15
/** O maior valor precisa ser pelo menos 15% maior: evita empates "na unha" (exceto onde há `minDiff`). */
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
}

export interface Category {
  id: string
  name: string
  icon: CategoryIcon
  question: string
  unit: string
  prefix?: string
  decimals?: number
  /** Diferença mínima entre os valores de um duelo (usada nas notas dos filmes, em vez da razão). */
  minDiff?: number
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

/** Dois valores são comparáveis sem empate "na unha": diferença mínima absoluta (notas) ou razão mínima. */
export function distinct(a: number, b: number, category: Pick<Category, 'minDiff'>): boolean {
  if (category.minDiff) return Math.abs(a - b) >= category.minDiff - 1e-9
  return Math.max(a, b) / Math.min(a, b) >= MIN_RATIO
}

/**
 * 25 duelos, 5 por categoria, como no outro jogo: quem tem mais continua (vai para a esquerda) e uma opção
 * nova entra à direita. Cada categoria usa 6 itens diferentes; em "Curiosidades", o tipo (população, área,
 * cidades, montanhas ou rios) é sorteado por dia. Mesma data, mesmos duelos.
 */
export function dailyRounds(categories: Category[], number: number): Round[] {
  return categories.slice(0, CATEGORIES).flatMap((category, categoryIndex) => {
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
    const used = new Set<string>()
    let champion = pool[Math.floor(rand() * pool.length)]
    used.add(champion.name)
    const rounds: Round[] = []
    for (let duel = 0; duel < DUELS_PER_CATEGORY; duel++) {
      const free = pool.filter((i) => !used.has(i.name))
      let next: Item | null = null
      for (let attempt = 0; attempt < 400 && !next; attempt++) {
        const c = free[Math.floor(rand() * free.length)]
        if (distinct(champion.value, c.value, category)) next = c
      }
      next ??= [...free].sort((x, y) => Math.abs(y.value - champion.value) - Math.abs(x.value - champion.value))[0]
      used.add(next.name)
      rounds.push({ category, categoryIndex, duel, left: champion, right: next, question, unit })
      if (next.value > champion.value) champion = next
    }
    return rounds
  })
}

/** Quem continua para o próximo duelo (o que tem mais). */
export function winnerOf(round: Pick<Round, 'left' | 'right'>): Item {
  return round.right.value > round.left.value ? round.right : round.left
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
