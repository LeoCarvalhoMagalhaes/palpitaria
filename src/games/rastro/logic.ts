export const MAX_BOARD = 512

export interface Entry {
  word: string
  rank: number
  isHint: boolean
}

export function fold(w: string): string {
  return w
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function decodeRanks(base64: string): Uint16Array {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Uint16Array(bytes.buffer)
}

export function dayFile(number: number, days: number, dir = 'rastro'): string {
  const n = (((number - 1) % days) + days) % days
  return `${dir}/day-${String(n + 1).padStart(3, '0')}.json`
}

/** Custo da dica (em tentativas) pela distância da palavra revelada. */
export const HINT_COST_BANDS = [
  { minRank: 1000, cost: 7 },
  { minRank: 160, cost: 5 },
  { minRank: 2, cost: 3 },
]

export function hintCost(rank: number): number {
  return HINT_COST_BANDS.find((b) => rank >= b.minRank)?.cost ?? 0
}

export function metrics(entries: Entry[]): { guessCount: number; hintCount: number } {
  let guessCount = 0
  let hintCount = 0
  for (const e of entries) {
    if (e.isHint) {
      hintCount += 1
      guessCount += hintCost(e.rank)
    } else guessCount += 1
  }
  return { guessCount, hintCount }
}

/** A dica revela uma palavra no meio do caminho entre o melhor palpite e a resposta. */
export function hintTargetRank(entries: Entry[]): number {
  const best = Math.min(...entries.map((e) => e.rank), Infinity)
  if (!Number.isFinite(best)) return 1000
  return Math.max(2, Math.floor(best / 2))
}

export function heat(rank: number): 'hot' | 'warm' | 'cold' {
  if (rank <= 300) return 'hot'
  if (rank <= 1500) return 'warm'
  return 'cold'
}

export function barWidth(rank: number, total: number): number {
  // Escala logarítmica: perto da resposta a barra enche rápido.
  const t = 1 - Math.log(rank) / Math.log(total)
  return Math.max(4, Math.round(t * 100))
}

export function shareText(name: string, number: number, entries: Entry[], won: boolean, lang: 'pt' | 'en' = 'pt'): string {
  const { guessCount, hintCount } = metrics(entries)
  const en = lang === 'en'
  const tries = en ? (guessCount === 1 ? 'guess' : 'guesses') : guessCount === 1 ? 'tentativa' : 'tentativas'
  const hints = en ? (hintCount === 1 ? 'hint' : 'hints') : hintCount === 1 ? 'dica' : 'dicas'
  const head = won
    ? `${name} #${number} — ${en ? 'found it in' : 'achei em'} ${guessCount} ${tries}${hintCount ? ` ${en ? 'and' : 'e'} ${hintCount} ${hints}` : ''}`
    : `${name} #${number} — ${en ? 'gave up after' : 'desisti depois de'} ${guessCount} ${tries}`
  const counts = { hot: 0, warm: 0, cold: 0 }
  for (const e of entries) if (e.rank > 1) counts[heat(e.rank)] += 1
  const bar = (n: number, emoji: string) => emoji.repeat(Math.min(n, 10)) + (n > 10 ? `+${n - 10}` : '')
  return [head, `🟩 ${bar(counts.hot, '🟩') || '0'}`, `🟧 ${bar(counts.warm, '🟧') || '0'}`, `🟥 ${bar(counts.cold, '🟥') || '0'}`].join('\n')
}
