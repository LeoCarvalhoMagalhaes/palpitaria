import { pickDaily } from '@/core/daily'
import { MIN_SONGS_PER_CATEGORY, type MusicCategory, type Song } from '@/config/music'

/** Duração do trecho liberado a cada tentativa (ms) — valores observados no original. */
export const SNIPPETS_MS = [130, 530, 2000, 8000, 15000]
export const MAX_TRIES = SNIPPETS_MS.length

export type Attempt = { kind: 'guess'; id: string; label: string; correct: boolean } | { kind: 'skip' }

export interface CategoryState {
  attempts: Attempt[]
}

export const emptyCategory = (): CategoryState => ({ attempts: [] })

/** Músicas que podem ser a resposta: precisam ter prévia de áudio. */
export function songsFor(category: MusicCategory, songs: Song[]): Song[] {
  return songs.filter((s) => s.appleId !== null && (!category.cat || s.cat === category.cat))
}

/** Categorias com músicas suficientes (as de gênero dependem dos dados da Apple). */
export function availableCategories(categories: MusicCategory[], songs: Song[]): MusicCategory[] {
  return categories.filter((c) => songsFor(c, songs).length >= MIN_SONGS_PER_CATEGORY)
}

/** Música do dia da categoria: sem repetir até esgotar a lista. */
export function dailySong(category: MusicCategory, songs: Song[], number: number): Song {
  const pool = [...songsFor(category, songs)].sort((a, b) => a.rank - b.rank)
  return pickDaily(pool, number, `toca-ai:${category.id}`)
}

export function isSolved(s: CategoryState): boolean {
  return s.attempts.some((a) => a.kind === 'guess' && a.correct)
}

export function isFinished(s: CategoryState): boolean {
  return isSolved(s) || s.attempts.length >= MAX_TRIES
}

export function snippetFor(s: CategoryState): number {
  return SNIPPETS_MS[Math.min(s.attempts.length, MAX_TRIES - 1)]
}

export function emojiRow(s: CategoryState): string {
  return Array.from({ length: MAX_TRIES }, (_, i) => {
    const a = s.attempts[i]
    if (!a) return '⬛'
    if (a.kind === 'skip') return '⬜'
    return a.correct ? '🟩' : '🟥'
  }).join('')
}

/** Vitória do dia: acertar pelo menos metade das categorias (arredondando para cima). */
export function winThreshold(categoryCount: number): number {
  return Math.ceil(categoryCount / 2)
}

export function shareText(name: string, number: number, categories: MusicCategory[], states: Record<string, CategoryState>): string {
  const lines = categories.map((c) => `${emojiRow(states[c.id] ?? emptyCategory())} ${c.name}`)
  const solved = categories.filter((c) => states[c.id] && isSolved(states[c.id])).length
  return `${name} #${number} 🎧 ${solved}/${categories.length}\n${lines.join('\n')}`
}

export function formatSeconds(ms: number): string {
  return ms < 1000 ? `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}s` : `${ms / 1000}s`
}
