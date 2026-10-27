import { addDays } from './daily'
import { readJSON, writeJSON } from './storage'

export interface GameStats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** Chave = tentativas usadas (ou "X" para derrota); valor = quantidade de jogos. */
  distribution: Record<string, number>
  lastPlayed: string | null
  lastWon: string | null
  /** Soma das pontuações, para jogos com média (ex.: tentativas no Mundaréu). */
  scoreSum: number
}

export const emptyStats = (): GameStats => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: {},
  lastPlayed: null,
  lastWon: null,
  scoreSum: 0,
})

/**
 * Registra o resultado de um desafio diário. A sequência conta vitórias em dias seguidos;
 * pular um dia ou perder zera. Registrar o mesmo dia duas vezes não altera nada.
 */
export function applyResult(
  stats: GameStats,
  date: string,
  won: boolean,
  bucket: string,
  score = 0,
): GameStats {
  if (stats.lastPlayed === date) return stats
  const next: GameStats = { ...stats, distribution: { ...stats.distribution } }
  next.played += 1
  next.lastPlayed = date
  next.scoreSum += score
  next.distribution[bucket] = (next.distribution[bucket] ?? 0) + 1
  if (won) {
    next.wins += 1
    next.currentStreak = stats.lastWon === addDays(date, -1) ? stats.currentStreak + 1 : 1
    next.lastWon = date
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak)
  } else {
    next.currentStreak = 0
  }
  return next
}

/** Sequência exibida hoje: se o último acerto foi antes de ontem, ela já quebrou. */
export function visibleStreak(stats: GameStats, today: string): number {
  if (!stats.lastWon) return 0
  if (stats.lastWon === today || stats.lastWon === addDays(today, -1)) return stats.currentStreak
  return 0
}

export function loadStats(slug: string): GameStats {
  return { ...emptyStats(), ...readJSON<Partial<GameStats>>(`${slug}:stats`, {}) }
}

export function saveStats(slug: string, stats: GameStats): void {
  writeJSON(`${slug}:stats`, stats)
}

export function recordResult(slug: string, date: string, won: boolean, bucket: string, score = 0): GameStats {
  const next = applyResult(loadStats(slug), date, won, bucket, score)
  saveStats(slug, next)
  return next
}

/** Sequência geral: dias seguidos em que o jogador terminou pelo menos um jogo. */
export interface GlobalActivity {
  days: string[]
}

export function markActivity(date: string): void {
  const act = readJSON<GlobalActivity>('activity', { days: [] })
  if (!act.days.includes(date)) {
    act.days = [...act.days, date].sort().slice(-400)
    writeJSON('activity', act)
  }
}

export function globalStreak(today: string): number {
  const days = new Set(readJSON<GlobalActivity>('activity', { days: [] }).days)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
