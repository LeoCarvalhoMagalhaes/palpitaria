import { pickDaily } from '@/core/daily'
import type { AudioCategory } from '@/config/soundcloud-sources'

/** Duração do trecho liberado a cada tentativa (ms) — valores observados no original. */
export const SNIPPETS_MS = [130, 530, 2000, 8000, 15000]
export const MAX_TRIES = SNIPPETS_MS.length
/** Categorias acertadas para o dia contar como vitória. */
export const WIN_CATEGORIES = 2

export type Attempt = { kind: 'guess'; id: number; label: string; correct: boolean } | { kind: 'skip' }

export interface CategoryState {
  attempts: Attempt[]
  answer: { id: number; label: string; url: string } | null
  done: boolean
}

/** Ordem de playlists a tentar para a categoria no dia (a primeira é a do dia; as outras são reserva). */
export function playlistOrder(category: AudioCategory, number: number): string[] {
  const first = pickDaily(category.playlists, number, `toca-ai:${category.id}:playlist`)
  return [first.url, ...category.playlists.filter((p) => p.url !== first.url).map((p) => p.url)]
}

/** Faixa do dia entre as faixas com título, determinística por data e playlist. */
export function dailyTrackIndex(titledCount: number, number: number, playlistUrl: string): number {
  const idx = Array.from({ length: titledCount }, (_, i) => i)
  return pickDaily(idx, number, `toca-ai:${playlistUrl}`)
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

export function shareText(name: string, number: number, categories: AudioCategory[], states: Record<string, CategoryState>): string {
  const lines = categories.map((c) => `${emojiRow(states[c.id] ?? { attempts: [], answer: null, done: false })} ${c.name}`)
  const solved = categories.filter((c) => states[c.id] && isSolved(states[c.id])).length
  return `${name} #${number} 🎧 ${solved}/${categories.length}\n${lines.join('\n')}`
}

export function formatSeconds(ms: number): string {
  return ms < 1000 ? `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}s` : `${ms / 1000}s`
}
