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
  /** Nas categorias misturadas, o tipo do item (o dia usa tipos diferentes). */
  group?: string
  /** O que está sendo medido ("altura", "valor levado (2005)"), mostrado abaixo do nome. */
  detail?: string
  /** Unidade e casas decimais do próprio item (sobrepõem as da categoria). */
  unit?: string
  decimals?: number
  /** Artigo da Wikipédia onde o valor foi conferido. */
  wiki?: string
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
  /** Mistura tipos (mercado x foguetes x roubos...): cada item do dia vem de um grupo diferente. */
  mix?: boolean
  items: Item[]
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
 * Sorteia um item. Nas categorias misturadas, primeiro o grupo (todos com a mesma chance, senão os 1.650
 * produtos de mercado engoliriam os foguetes e os roubos) e depois o item dentro dele.
 */
function pickItem(items: Item[], category: Category, rand: () => number): Item {
  if (!category.mix) return items[Math.floor(rand() * items.length)]
  const groups = [...new Set(items.map((i) => i.group))]
  const g = groups[Math.floor(rand() * groups.length)]
  const inGroup = items.filter((i) => i.group === g)
  return inGroup[Math.floor(rand() * inGroup.length)]
}

/**
 * 25 duelos, 5 por categoria, como no outro jogo: quem tem mais continua (vai para a esquerda) e uma opção
 * nova entra à direita. Cada categoria usa 6 itens diferentes. Em cada duelo, uma moeda decide se a opção nova
 * terá mais ou menos que a que continua; sem isso, quem continua (já vencedor) ganharia quase sempre e a
 * resposta ficaria previsível. Nas categorias misturadas, os 6 itens do dia são de tipos diferentes.
 * Mesma data, mesmos duelos.
 */
export function dailyRounds(categories: Category[], number: number): Round[] {
  return categories.slice(0, CATEGORIES).flatMap((category, categoryIndex) => {
    const rand = seededRandom(`mais-ou-menos:${category.id}:${number}`)
    const pool = category.items
    const used = new Set<string>()
    const usedGroups = new Set<string | undefined>()
    let champion = pickItem(pool, category, rand)
    used.add(champion.name)
    usedGroups.add(champion.group)
    const rounds: Round[] = []
    for (let duel = 0; duel < DUELS_PER_CATEGORY; duel++) {
      const higher = rand() < 0.5
      const free = pool.filter((i) => !used.has(i.name) && distinct(champion.value, i.value, category))
      const newGroup = (i: Item) => !category.mix || !usedGroups.has(i.group)
      const wanted = (i: Item) => i.value > champion.value === higher
      // Do ideal (tipo novo, lado sorteado) ao possível, preferindo variar o tipo; o último recurso aceita qualquer item livre.
      const stages = [free.filter((i) => newGroup(i) && wanted(i)), free.filter(newGroup), free.filter(wanted), free]
      const options = stages.find((s) => s.length > 0) ?? pool.filter((i) => !used.has(i.name))
      const next = pickItem(options, category, rand)
      used.add(next.name)
      usedGroups.add(next.group)
      rounds.push({ category, categoryIndex, duel, left: champion, right: next, question: category.question, unit: category.unit })
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

/** Valores de um milhão para cima aparecem por extenso ("25,8 bilhões"), mais fáceis de comparar de relance. */
export function formatValue(value: number, unit: string, prefix = '', decimals = 0, lang: Lang = 'pt'): string {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const big = value >= 1e6
  const n = big
    ? value.toLocaleString(locale, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 })
    : value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const p = lang === 'en' && prefix.trim() === 'US$' ? '$' : prefix
  // "1,2 milhão de habitantes" em português; "1.2 million people" em inglês.
  const u = unit ? (big && lang === 'pt' ? ` de ${unit}` : ` ${unit}`) : ''
  return `${p}${n}${u}`
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
