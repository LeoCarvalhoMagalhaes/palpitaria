import { seededRandom, seededShuffle } from '@/core/daily'

export const WIDTH = 12
export const HEIGHT = 10
export const MAX_WORDS = 8
export const MIN_WORDS = 5
export const CLUE_START_MS = 0
export const CLUE_DURATION_MS = 8000

export type Direction = 'across' | 'down'

export interface Candidate {
  answer: string
  clue: string
  /** ID da faixa no Spotify (para tocar o trecho). */
  trackId: string
}

export interface PlacedWord extends Candidate {
  x: number
  y: number
  direction: Direction
  number: number
  color: string
}

export const WORD_COLORS = ['#FE9C9C', '#FFB34B', '#28D66A', '#00C2FF', '#568EFF', '#FFCEFD', '#FF5B5E', '#B197FC']

/** Só letras A–Z, sem acento e sem espaço (como numa cruzadinha de verdade). */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

/** Monta candidatos a partir de "artista" e "música" de cada faixa. */
export function buildCandidates(tracks: { artist: string; song: string; trackId: string }[]): Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()
  const push = (answer: string, clue: string, trackId: string) => {
    if (answer.length < 3 || answer.length > WIDTH - 2 || seen.has(answer)) return
    seen.add(answer)
    out.push({ answer, clue, trackId })
  }
  for (const t of tracks) {
    const artist = normalizeAnswer(t.artist)
    const song = normalizeAnswer(t.song)
    if (artist) push(artist, 'Quem canta este trecho?', t.trackId)
    if (song && song.length <= WIDTH - 2) push(song, 'Qual é o nome desta música?', t.trackId)
    else {
      const word = t.song
        .split(/\s+/)
        .map(normalizeAnswer)
        .filter((w) => w.length >= 5)
        .sort((a, b) => b.length - a.length)[0]
      if (word) push(word, 'Uma palavra do título desta música', t.trackId)
    }
  }
  return out
}

type Cell = { letter: string; across: boolean; down: boolean } | null

function emptyGrid(): Cell[][] {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => null))
}

function canPlace(grid: Cell[][], word: string, x: number, y: number, dir: Direction): number {
  const dx = dir === 'across' ? 1 : 0
  const dy = dir === 'down' ? 1 : 0
  const endX = x + dx * (word.length - 1)
  const endY = y + dy * (word.length - 1)
  if (x < 0 || y < 0 || endX >= WIDTH || endY >= HEIGHT) return -1
  // Antes do início e depois do fim precisam estar vazios.
  const before = grid[y - dy]?.[x - dx]
  const after = grid[endY + dy]?.[endX + dx]
  if (before || after) return -1
  let crossings = 0
  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i
    const cy = y + dy * i
    const cell = grid[cy][cx]
    if (cell) {
      if (cell.letter !== word[i]) return -1
      if (dir === 'across' ? cell.across : cell.down) return -1
      crossings += 1
    } else {
      // Célula nova não pode encostar em letras pelos lados (evita palavras coladas).
      const side1 = dir === 'across' ? grid[cy - 1]?.[cx] : grid[cy]?.[cx - 1]
      const side2 = dir === 'across' ? grid[cy + 1]?.[cx] : grid[cy]?.[cx + 1]
      if (side1 || side2) return -1
    }
  }
  return crossings
}

function place(grid: Cell[][], word: string, x: number, y: number, dir: Direction) {
  for (let i = 0; i < word.length; i++) {
    const cx = x + (dir === 'across' ? i : 0)
    const cy = y + (dir === 'down' ? i : 0)
    const cell = grid[cy][cx] ?? { letter: word[i], across: false, down: false }
    if (dir === 'across') cell.across = true
    else cell.down = true
    grid[cy][cx] = cell
  }
}

/** Gera a cruzadinha do dia: determinística para a mesma lista de candidatos e semente. */
export function generateCrossword(candidates: Candidate[], seed: string): PlacedWord[] | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rand = seededRandom(`${seed}#${attempt}`)
    const pool = seededShuffle(candidates, `${seed}#${attempt}`).slice(0, 40)
    pool.sort((a, b) => b.answer.length - a.answer.length || 0)
    const grid = emptyGrid()
    const placed: Omit<PlacedWord, 'number' | 'color'>[] = []
    const usedTracks = new Set<string>()
    for (const cand of pool) {
      if (placed.length >= MAX_WORDS) break
      if (usedTracks.has(cand.trackId) && placed.length > 0 && rand() < 0.7) continue
      if (placed.length === 0) {
        const x = Math.floor((WIDTH - cand.answer.length) / 2)
        const y = Math.floor(HEIGHT / 2) - 1
        place(grid, cand.answer, x, y, 'across')
        placed.push({ ...cand, x, y, direction: 'across' })
        usedTracks.add(cand.trackId)
        continue
      }
      let best: { x: number; y: number; dir: Direction; score: number } | null = null
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          for (const dir of ['across', 'down'] as Direction[]) {
            const c = canPlace(grid, cand.answer, x, y, dir)
            if (c > 0) {
              const score = c * 10 + rand()
              if (!best || score > best.score) best = { x, y, dir, score }
            }
          }
        }
      }
      if (best) {
        place(grid, cand.answer, best.x, best.y, best.dir)
        placed.push({ ...cand, x: best.x, y: best.y, direction: best.dir })
        usedTracks.add(cand.trackId)
      }
    }
    if (placed.length >= MIN_WORDS) return numberWords(placed)
  }
  return null
}

function numberWords(words: Omit<PlacedWord, 'number' | 'color'>[]): PlacedWord[] {
  const starts = [...new Set(words.map((w) => `${w.y},${w.x}`))].sort((a, b) => {
    const [ay, ax] = a.split(',').map(Number)
    const [by, bx] = b.split(',').map(Number)
    return ay - by || ax - bx
  })
  return words.map((w, i) => ({
    ...w,
    number: starts.indexOf(`${w.y},${w.x}`) + 1,
    color: WORD_COLORS[i % WORD_COLORS.length],
  }))
}

export function cellsOf(w: PlacedWord): [number, number][] {
  return Array.from({ length: w.answer.length }, (_, i) =>
    w.direction === 'across' ? [w.x + i, w.y] : [w.x, w.y + i],
  )
}

export function solutionMap(words: PlacedWord[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const w of words) cellsOf(w).forEach(([x, y], i) => m.set(`${x},${y}`, w.answer[i]))
  return m
}

export function isComplete(words: PlacedWord[], letters: Record<string, string>): boolean {
  return [...solutionMap(words).keys()].every((k) => letters[k])
}

export function isCorrect(words: PlacedWord[], letters: Record<string, string>): boolean {
  return [...solutionMap(words).entries()].every(([k, v]) => letters[k] === v)
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function timeBucket(seconds: number): string {
  if (seconds <= 120) return '≤2min'
  if (seconds <= 300) return '≤5min'
  if (seconds <= 600) return '≤10min'
  return '10+min'
}

export function shareText(name: string, number: number, dateLabel: string, seconds: number, helps: number, archive: boolean): string {
  return `${name} #${number} - ${dateLabel}${archive ? ' (arquivo)' : ''}\n⏱ ${formatTime(seconds)} · 🎧 · ${helps ? `${helps} ${helps === 1 ? 'ajuda' : 'ajudas'}` : 'sem ajuda ✨'}`
}
