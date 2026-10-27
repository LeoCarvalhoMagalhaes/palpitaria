/** Leitura e gravação no localStorage, à prova de modo privado e cotas cheias. */

const PREFIX = 'palpitaria:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Sem armazenamento disponível: o jogo segue funcionando, só não lembra o progresso.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignorado
  }
}

export type GameStatus = 'new' | 'playing' | 'won' | 'lost'

/** Envelope salvo por jogo e por dia. `v` permite descartar formatos antigos. */
export interface DayRecord<S> {
  v: number
  status: GameStatus
  state: S
}

export function dayKey(slug: string, date: string): string {
  return `${slug}:day:${date}`
}

export function readDay<S>(slug: string, date: string, version: number): DayRecord<S> | null {
  const rec = readJSON<DayRecord<S> | null>(dayKey(slug, date), null)
  if (!rec || rec.v !== version) return null
  return rec
}

export function readDayStatus(slug: string, date: string): GameStatus {
  return readJSON<DayRecord<unknown> | null>(dayKey(slug, date), null)?.status ?? 'new'
}
