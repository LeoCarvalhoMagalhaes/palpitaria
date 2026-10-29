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

export type Lang = 'pt' | 'en'

/** Metadados de uma faixa usados para montar pistas variadas. */
export interface TrackMeta {
  artist: string
  song: string
  trackId: string
  year?: number | null
  genre?: string | null
  titleLang?: string
  /** Dados do artista principal vindos do Holofote (quando ele está lá). */
  info?: { gender: string; members: number; country: string; countryName: string } | null
}

export interface Theme {
  id: string
  pt: string
  en: string
  filter: (t: TrackMeta) => boolean
  /** "year": as pistas citam o ano do sucesso (temas de década). */
  context?: 'year'
}

const inGenres = (list: string[]) => (t: TrackMeta) => !!t.genre && list.includes(t.genre)
const between = (a: number, b: number) => (t: TrackMeta) => !!t.year && t.year >= a && t.year < b

/** Artista principal: o primeiro nome antes de vírgula, "&", "feat." ou " x ". */
export function mainArtist(artist: string): string {
  return artist.split(/,| & | feat\.? | ft\. | x | with /i)[0].trim()
}

/** Artistas com 10+ músicas no top: cada um ganha um dia de "especial". */
export const SPECIAL_ARTISTS = [
  'The Weeknd',
  'Taylor Swift',
  'Ariana Grande',
  'Billie Eilish',
  'Bruno Mars',
  'Eminem',
  'Ed Sheeran',
  'Drake',
  'Post Malone',
  'Coldplay',
  'Maroon 5',
  'Rihanna',
  'Imagine Dragons',
  'Calvin Harris',
  'Adele',
]

export const THEMES: Theme[] = [
  { id: 'top', pt: 'As mais tocadas do Spotify', en: "Spotify's most streamed", filter: () => true },
  { id: 'classicos', pt: 'Clássicos de antes de 1990', en: 'Classics from before 1990', filter: between(0, 1990), context: 'year' },
  { id: 'anos90', pt: 'Anos 90', en: 'The 90s', filter: between(1990, 2000), context: 'year' },
  { id: 'anos2000', pt: 'Anos 2000', en: 'The 2000s', filter: between(2000, 2010), context: 'year' },
  { id: 'anos2010', pt: 'Anos 2010', en: 'The 2010s', filter: between(2010, 2020), context: 'year' },
  { id: 'anos2020', pt: 'Anos 2020', en: 'The 2020s', filter: between(2020, 2100), context: 'year' },
  { id: 'hiphop', pt: 'Hip hop e rap', en: 'Hip hop and rap', filter: inGenres(['Hip-Hop/Rap', 'Rap', 'Hip-Hop']) },
  { id: 'rock', pt: 'Rock e alternativo', en: 'Rock and alternative', filter: inGenres(['Rock', 'Hard Rock', 'Indie Rock', 'Alternative', 'Metal', 'Punk', 'Pop/Rock']) },
  { id: 'latino', pt: 'Hits latinos', en: 'Latin hits', filter: inGenres(['Latin', 'Urbano latino', 'Pop Latino', 'Música Mexicana', 'Música tropical']) },
  { id: 'pista', pt: 'Pista de dança', en: 'Dance floor', filter: inGenres(['Dance', 'House', 'Electronic', 'Electronica']) },
  { id: 'rnb', pt: 'R&B e soul', en: 'R&B and soul', filter: inGenres(['R&B/Soul', 'Contemporary R&B', 'Neo-Soul']) },
  { id: 'divas', pt: 'Divas do pop', en: 'Pop divas', filter: (t) => t.info?.gender === 'Feminino' && t.info.members === 1 },
  { id: 'bandas', pt: 'Bandas', en: 'Bands', filter: (t) => (t.info?.members ?? 1) >= 2 },
  ...SPECIAL_ARTISTS.map((name) => ({
    id: `artista:${name}`,
    pt: `Especial ${name}`,
    en: `${name} special`,
    filter: (t: TrackMeta) => mainArtist(t.artist) === name,
  })),
]

export function themeById(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

/** Tema do dia: percorre a lista embaralhada, um tema por dia. */
export function dailyTheme(number: number): Theme {
  const order = seededShuffle(THEMES, 'refrao-cruzado:temas')
  return order[(((number - 1) % order.length) + order.length) % order.length]
}

const NUMBERS: Record<Lang, string[]> = {
  pt: ['', 'UM', 'DOIS', 'TRES', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE', 'DEZ'],
  en: ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'],
}

/** Gênero da Apple → resposta curta, como se escreve em cada idioma. */
const GENRE_ANSWER: Record<string, { pt: string; en: string }> = {
  Pop: { pt: 'POP', en: 'POP' },
  Rock: { pt: 'ROCK', en: 'ROCK' },
  'Hard Rock': { pt: 'ROCK', en: 'ROCK' },
  'Indie Rock': { pt: 'ROCK', en: 'ROCK' },
  'Pop/Rock': { pt: 'ROCK', en: 'ROCK' },
  'Hip-Hop/Rap': { pt: 'RAP', en: 'RAP' },
  Rap: { pt: 'RAP', en: 'RAP' },
  'Hip-Hop': { pt: 'RAP', en: 'RAP' },
  Dance: { pt: 'DANCE', en: 'DANCE' },
  House: { pt: 'HOUSE', en: 'HOUSE' },
  Electronic: { pt: 'ELETRONICA', en: 'ELECTRONIC' },
  Electronica: { pt: 'ELETRONICA', en: 'ELECTRONIC' },
  Metal: { pt: 'METAL', en: 'METAL' },
  Reggae: { pt: 'REGGAE', en: 'REGGAE' },
  Country: { pt: 'COUNTRY', en: 'COUNTRY' },
  Folk: { pt: 'FOLK', en: 'FOLK' },
  Jazz: { pt: 'JAZZ', en: 'JAZZ' },
  Punk: { pt: 'PUNK', en: 'PUNK' },
  'K-Pop': { pt: 'KPOP', en: 'KPOP' },
  Afrobeats: { pt: 'AFROBEATS', en: 'AFROBEATS' },
  'Urbano latino': { pt: 'LATINA', en: 'LATIN' },
  'Pop Latino': { pt: 'LATINA', en: 'LATIN' },
  Latin: { pt: 'LATINA', en: 'LATIN' },
}

/** País do artista → resposta que cabe na grade (siglas quando o nome é longo). */
function countryAnswer(code: string, ptName: string, lang: Lang): { answer: string; abbr: boolean } | null {
  if (code === 'US') return { answer: lang === 'en' ? 'USA' : 'EUA', abbr: true }
  if (code === 'GB') return lang === 'en' ? { answer: 'BRITAIN', abbr: false } : { answer: 'REINOUNIDO', abbr: false }
  let name = ptName
  if (lang === 'en') {
    try {
      name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? ptName
    } catch {
      name = ptName
    }
  }
  const answer = normalizeAnswer(name)
  return answer ? { answer, abbr: false } : null
}

/** Título sem "(feat. …)", "- Remix" e afins. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim()
}

/** Nomes artísticos de duas palavras que não são "nome e sobrenome" (Lady Gaga, The Weeknd, Sean Paul…). */
const NOT_FIRST_LAST = new Set(
  [
    'The Weeknd', 'Post Malone', 'Lady Gaga', 'DJ Snake', 'Doja Cat', 'Dr. Dre', 'Snoop Dogg', 'Flo Rida', 'Ice Cube', 'Lil Baby',
    'Lil Wayne', 'Metro Boomin', 'Mazzy Star', 'Kodak Black', 'Childish Gambino', 'Baby Keem', '21 Savage', '50 Cent', 'Wiz Khalifa',
    'Juice WRLD', 'Cardi B', 'Bad Bunny', 'Tame Impala', 'Daddy Yankee', 'The Lumineers', 'A$AP Rocky', 'J. Cole', 'J Balvin',
    'Jung Kook', 'Sean Paul', 'Tory Lanez', 'Nicki Minaj', 'Tove Lo', 'Ava Max', 'Kid Cudi', 'Ice Spice', 'Teddy Swims', 'Mac Miller',
  ].map(normalizeAnswer),
)

const T = {
  title: { pt: 'Nome desta música', en: 'Title of this song' },
  word: { pt: 'Complete o título', en: 'Fill in the title' },
  artist: { pt: 'Quem canta este trecho?', en: 'Who sings this?' },
  band: { pt: 'Que banda é esta?', en: 'Which band is this?' },
  first: { pt: 'Primeiro nome de quem canta', en: "The singer's first name" },
  last: { pt: 'Sobrenome de quem canta', en: "The singer's last name" },
  genre: { pt: 'Gênero musical desta faixa', en: 'Music genre of this track' },
  country: { pt: 'País de origem de quem canta', en: 'Home country of this artist' },
  countryAbbr: { pt: 'País de origem de quem canta (sigla)', en: 'Home country of this artist (abbreviation)' },
  members: { pt: 'Quantos integrantes tem esta banda? (por extenso)', en: 'How many members does this band have? (spelled out)' },
  english: { pt: ' (em inglês)', en: '' },
  spanish: { pt: ' (em espanhol)', en: ' (in Spanish)' },
  portuguese: { pt: '', en: ' (in Portuguese)' },
}

/**
 * Monta candidatos com pistas variadas, como no outro jogo: título, completar o título,
 * artista (nome, primeiro nome ou sobrenome), gênero, país e número de integrantes.
 * Avisa quando a resposta está em outro idioma.
 */
export function buildCandidates(tracks: TrackMeta[], lang: Lang = 'pt', theme: Theme = THEMES[0]): Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()
  const push = (answer: string, clue: string, trackId: string) => {
    if (answer.length < 3 || answer.length > WIDTH - 2 || seen.has(answer)) return
    seen.add(answer)
    out.push({ answer, clue, trackId })
  }
  for (const t of tracks) {
    const prefix = theme.context === 'year' && t.year ? (lang === 'en' ? `${t.year} hit: ` : `Sucesso de ${t.year}: `) : ''
    const clue = (text: string) => {
      const c = prefix ? prefix + text.charAt(0).toLowerCase() + text.slice(1) : text
      return c
    }
    const titleNote = t.titleLang === 'en' ? T.english[lang] : t.titleLang === 'es' ? T.spanish[lang] : t.titleLang === 'pt' ? T.portuguese[lang] : ''
    const title = cleanTitle(t.song)
    const artist = mainArtist(t.artist)
    const isBand = (t.info?.members ?? 1) >= 2

    // Título inteiro, ou "complete o título" com uma palavra longa escondida.
    const whole = normalizeAnswer(title)
    if (whole.length >= 3 && whole.length <= WIDTH - 2) push(whole, clue(T.title[lang]) + titleNote, t.trackId)
    const words = title.split(/\s+/)
    if (words.length >= 2) {
      const idx = words
        .map((w, i) => ({ i, a: normalizeAnswer(w) }))
        .filter((x) => x.a.length >= 4)
        .sort((a, b) => b.a.length - a.a.length)[0]?.i
      if (idx !== undefined) {
        const shown = words.map((w, i) => (i === idx ? '___' : w)).join(' ')
        push(normalizeAnswer(words[idx]), `${clue(T.word[lang])}: “${shown}”${titleNote}`, t.trackId)
      }
    }

    // Artista (no especial de um artista, só uma vez: o `seen` evita repetir a resposta).
    const full = normalizeAnswer(artist)
    if (full.length <= WIDTH - 2) push(full, clue((isBand ? T.band : T.artist)[lang]), t.trackId)
    const parts = artist.split(/\s+/)
    if (!isBand && parts.length === 2 && t.info && !NOT_FIRST_LAST.has(full)) {
      push(normalizeAnswer(parts[0]), clue(T.first[lang]), t.trackId)
      push(normalizeAnswer(parts[1]), clue(T.last[lang]), t.trackId)
    }

    // Metadados: gênero, país e integrantes.
    const genre = t.genre ? GENRE_ANSWER[t.genre] : undefined
    if (genre) push(genre[lang], clue(T.genre[lang]), t.trackId)
    if (t.info) {
      const c = countryAnswer(t.info.country, t.info.countryName, lang)
      if (c) push(c.answer, clue((c.abbr ? T.countryAbbr : T.country)[lang]), t.trackId)
      if (isBand && t.info.members <= 10) push(NUMBERS[lang][t.info.members], clue(T.members[lang]), t.trackId)
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

export function shareText(name: string, number: number, dateLabel: string, seconds: number, helps: number, archive: boolean, lang: Lang = 'pt', theme = ''): string {
  const en = lang === 'en'
  const helpText = helps ? (en ? `${helps} ${helps === 1 ? 'hint' : 'hints'}` : `${helps} ${helps === 1 ? 'ajuda' : 'ajudas'}`) : en ? 'no hints ✨' : 'sem ajuda ✨'
  const head = `${name} #${number} - ${dateLabel}${archive ? (en ? ' (archive)' : ' (arquivo)') : ''}`
  return `${head}${theme ? `
🎼 ${theme}` : ''}
⏱ ${formatTime(seconds)} · 🎧 · ${helpText}`
}
