import { pickDaily } from '@/core/daily'

export const MAX_GUESSES = 6
export const WIN_PERCENT = 5
export const NEAR_PERCENT = 25

export interface Product {
  id: string
  name: string
  size: string
  price: number
  category: string
  emoji: string
  image?: { src: string; page: string; license?: string }
}

export const CATEGORY_EN: Record<string, string> = {
  Carnes: 'Meat',
  Mercearia: 'Pantry',
  'Doces e salgadinhos': 'Candy and snacks',
  Padaria: 'Bakery',
  'Peixes e frutos do mar': 'Fish and seafood',
  Bebidas: 'Drinks',
  'Temperos e molhos': 'Spices and sauces',
  'Frutas e verduras': 'Fruits and vegetables',
  'Laticínios e ovos': 'Dairy and eggs',
  'Café e chá': 'Coffee and tea',
  Congelados: 'Frozen food',
}

export type Closeness = 'win' | 'near' | 'far'
export type Arrow = 'up' | 'down' | 'check'

export interface PriceGuess {
  value: number
  closeness: Closeness
  /** up = o preço é MAIOR que o chute; down = o preço é MENOR. */
  arrow: Arrow
}

/** Diferença percentual do chute em relação ao preço (negativa = chute abaixo). */
export function percentAway(guess: number, price: number): number {
  return ((guess * 100) / (price * 100)) * 100 - 100
}

export function evaluatePrice(guess: number, price: number): PriceGuess {
  const pct = percentAway(guess, price)
  const abs = Math.abs(pct)
  // Tolerância para erros de ponto flutuante no limite exato (ex.: 16,80 sobre 16,00 = 5%).
  if (abs <= WIN_PERCENT + 1e-9) return { value: guess, closeness: 'win', arrow: 'check' }
  return {
    value: guess,
    closeness: abs <= NEAR_PERCENT + 1e-9 ? 'near' : 'far',
    arrow: pct < 0 ? 'up' : 'down',
  }
}

/**
 * Lê valores digitados como "12,90", "12.90", "1.234,56", "1,234.56" ou "12".
 * O último separador seguido de 1–2 dígitos é o decimal.
 */
export function parsePrice(input: string): number | null {
  const s = input.replace(/[^\d.,]/g, '')
  if (!s || !/\d/.test(s)) return null
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let normalized: string
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2 && s.length - lastSep - 1 > 0) {
    normalized = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1)
  } else {
    normalized = s.replace(/[.,]/g, '')
  }
  const n = Math.round(Number(normalized) * 100) / 100
  return Number.isFinite(n) && n > 0 ? n : null
}

/** O produto do dia sai só entre os que têm foto da embalagem (se houver algum). */
export function dailyProduct(products: Product[], number: number): Product {
  const withPhoto = products.filter((p) => p.image)
  const sorted = [...(withPhoto.length ? withPhoto : products)].sort((a, b) => a.id.localeCompare(b.id))
  return pickDaily(sorted, number, 'na-etiqueta')
}

export function formatUSD(value: number, lang: 'pt' | 'en' = 'pt'): string {
  const n = value.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return lang === 'en' ? `$${n}` : `US$ ${n}`
}

export function shareText(shareName: string, number: number, guesses: PriceGuess[], won: boolean): string {
  const lines = guesses.map((g) => {
    const arrow = g.arrow === 'check' ? '✅' : g.arrow === 'up' ? '⬆️' : '⬇️'
    const color = g.closeness === 'win' ? '' : g.closeness === 'near' ? '🟨' : '🟥'
    return arrow + color
  })
  return [`${shareName} #${number} ${won ? guesses.length : 'X'}/${MAX_GUESSES}`, ...lines].join('\n')
}
