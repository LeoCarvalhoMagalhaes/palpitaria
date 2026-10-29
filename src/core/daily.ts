/** Utilitários de data local e aleatoriedade com semente, compartilhados por todos os jogos. */

const DAY_MS = 24 * 60 * 60 * 1000

/** Data local no formato YYYY-MM-DD (o desafio vira à meia-noite do fuso do jogador). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Converte YYYY-MM-DD em um número de dias absoluto, sem depender de fuso ou horário de verão. */
export function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

export function addDays(key: string, days: number): string {
  const ms = (dayIndex(key) + days) * DAY_MS
  const date = new Date(ms)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidDateKey(key: string | null | undefined): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  return addDays(key, 0) === key
}

/** Número do desafio: dias desde o lançamento + 1. */
export function puzzleNumber(launchDate: string, key: string): number {
  return dayIndex(key) - dayIndex(launchDate) + 1
}

export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatDateLong(key: string, lang: 'pt' | 'en' = 'pt', withYear = true): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** Hash de string para semente (cyrb53). */
export function hashString(str: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** Gerador pseudoaleatório mulberry32: mesma semente, mesma sequência em qualquer navegador. */
export function seededRandom(seed: string | number): () => number {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const rand = seededRandom(seed)
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Escolhe o item do dia sem repetir até esgotar a lista: a lista é embaralhada uma vez por
 * "ciclo" com semente fixa, e cada ciclo usa uma ordem nova.
 */
export function pickDaily<T>(items: readonly T[], number: number, seed: string): T {
  if (items.length === 0) throw new Error('Lista vazia')
  const index = Math.max(0, number - 1)
  const cycle = Math.floor(index / items.length)
  const order = seededShuffle(items, `${seed}:${cycle}`)
  return order[index % items.length]
}

/** Remove acentos e baixa a caixa, para comparar textos digitados. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
