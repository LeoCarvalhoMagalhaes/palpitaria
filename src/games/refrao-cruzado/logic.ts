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

/**
 * Tema do dia: o tema está nas perguntas e respostas, não na escolha das músicas. As faixas vêm do repertório
 * inteiro; o tema define o que se pergunta sobre elas:
 *  - "word": a resposta é uma palavra do título (ou do nome de quem canta) que pertence ao tema (cores, números…);
 *  - "mix": perguntas variadas (título, completar o título, quem canta, gênero, país…);
 *  - "names": quem canta (nome artístico, primeiro nome, sobrenome, banda);
 *  - "titles": nomes de músicas (título inteiro ou completar o título);
 *  - "world": país de origem de quem canta e lugares citados nos títulos;
 *  - "bands": bandas (nome, número de integrantes, país);
 *  - "artist": especial de um artista, com perguntas variadas (só de vez em quando).
 */
export interface Theme {
  id: string
  pt: string
  en: string
  kind: 'word' | 'mix' | 'names' | 'titles' | 'world' | 'bands' | 'artist'
  /** Palavras do tema (já normalizadas), para os temas "word" e "world". */
  words?: Set<string>
  artist?: string
}

/** Artista principal: o primeiro nome antes de vírgula, "&", "feat." ou " x ". */
export function mainArtist(artist: string): string {
  return artist.split(/,| & | feat\.? | ft\. | x | with /i)[0].trim()
}

/** Artistas com muitas músicas no repertório: cada um ganha, de tempos em tempos, um dia de "especial". */
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

const lexicon = (text: string) => new Set(text.trim().split(/\s+/).map(normalizeAnswer))

/** Palavras de cada tema em inglês, espanhol e português (os títulos misturam os três). */
const WORDS = {
  cores: lexicon(`red blue green yellow black white pink purple gold golden silver orange grey gray brown violet scarlet
    rojo roja azul verde negro negra blanco blanca amarillo rosa vermelho vermelha preto preta branco branca amarelo dourado`),
  numeros: lexicon(`one two three four five six seven eight nine ten eleven twelve twenty hundred thousand million billion first
    uno tres cuatro cinco seis siete ocho nueve diez cien mil dois quatro sete oito nove`),
  corpo: lexicon(`heart hearts eyes eye hands hand lips head body face skin mind bones blood feet arms hair teeth neck shoulder
    legs mouth tongue soul corazon ojos boca manos piel cabeza coracao olhos mao cabeca corpo`),
  natureza: lexicon(`rain sun sunshine moon stars star sky fire ice ocean sea river snow storm thunder lightning wind summer winter
    spring flowers flower roses rose mountain earth water waves wave rainbow cloud clouds forest island garden paradise
    lluvia sol luna mar cielo fuego agua chuva lua fogo estrella estrela flor verano`),
  tempo: lexicon(`night nights tonight day days today tomorrow yesterday forever time times morning midnight sunday monday friday
    saturday weekend year years now minute hour hours moment noche hoy ayer manana siempre noite hoje sempre agora ahora`),
  sentimentos: lexicon(`love lover lovers lonely happy crazy sorry cry crying tears smile feel feeling sad happiness jealous hate kiss
    heartbreak broken alone hurt fear afraid amor feliz saudade loco loca triste beso beijo paixao pasion`),
  gente: lexicon(`baby girl girls boy boys man men woman women mama mami papi daddy mother father brother sister friend friends
    lady king queen prince princess senorita chica nena hermano amigo amiga bebe girlfriend boyfriend hero stranger
    strangers people mamacita`),
  movimento: lexicon(`dance dancing dancin run running move moving fly flying fall falling walk walking ride drive jump shake
    swing roll bailar baila bailando perreo danca`),
  lugares: lexicon(`california paris london havana miami tokyo vegas america rome roma texas brazil brasil mexico africa hollywood
    manhattan brooklyn jamaica italia spain berlin houston atlanta detroit memphis hawaii tennessee georgia carolina
    alabama kentucky medellin puerto`),
}

const THEME_LIST: Theme[] = [
  { id: 'misto', pt: 'Miscelânea', en: 'Grab bag', kind: 'mix' },
  { id: 'cores', pt: 'Cores', en: 'Colors', kind: 'word', words: WORDS.cores },
  { id: 'numeros', pt: 'Números', en: 'Numbers', kind: 'word', words: WORDS.numeros },
  { id: 'corpo', pt: 'Corpo humano', en: 'The human body', kind: 'word', words: WORDS.corpo },
  { id: 'natureza', pt: 'Natureza e clima', en: 'Nature and weather', kind: 'word', words: WORDS.natureza },
  { id: 'tempo', pt: 'Dias, noites e tempo', en: 'Days, nights and time', kind: 'word', words: WORDS.tempo },
  { id: 'sentimentos', pt: 'Amor e sentimentos', en: 'Love and feelings', kind: 'word', words: WORDS.sentimentos },
  { id: 'gente', pt: 'Gente: família, amigos e realeza', en: 'People: family, friends and royalty', kind: 'word', words: WORDS.gente },
  { id: 'movimento', pt: 'Dança e movimento', en: 'Dance and motion', kind: 'word', words: WORDS.movimento },
  { id: 'mundo', pt: 'Pelo mundo', en: 'Around the world', kind: 'world', words: WORDS.lugares },
  { id: 'nomes', pt: 'Quem canta?', en: 'Who sings it?', kind: 'names' },
  { id: 'titulos', pt: 'Nomes de músicas', en: 'Song titles', kind: 'titles' },
  { id: 'bandas', pt: 'Bandas', en: 'Bands', kind: 'bands' },
]

export const ARTIST_THEMES: Theme[] = SPECIAL_ARTISTS.map((name) => ({
  id: `artista:${name}`,
  pt: `Especial ${name}`,
  en: `${name} special`,
  kind: 'artist',
  artist: name,
}))

export const THEMES: Theme[] = [...THEME_LIST, ...ARTIST_THEMES]

/** Temas antigos (de quando o tema escolhia as músicas): só o nome, para cruzadinhas já salvas. */
const LEGACY: Record<string, [string, string]> = {
  top: ['As mais tocadas do Spotify', "Spotify's most streamed"],
  classicos: ['Clássicos de antes de 1990', 'Classics from before 1990'],
  anos90: ['Anos 90', 'The 90s'],
  anos2000: ['Anos 2000', 'The 2000s'],
  anos2010: ['Anos 2010', 'The 2010s'],
  anos2020: ['Anos 2020', 'The 2020s'],
  hiphop: ['Hip hop e rap', 'Hip hop and rap'],
  rock: ['Rock e alternativo', 'Rock and alternative'],
  latino: ['Hits latinos', 'Latin hits'],
  pista: ['Pista de dança', 'Dance floor'],
  rnb: ['R&B e soul', 'R&B and soul'],
  divas: ['Divas do pop', 'Pop divas'],
}

export function themeById(id: string | undefined): Theme {
  const legacy = id ? LEGACY[id] : undefined
  if (legacy) return { id: id!, pt: legacy[0], en: legacy[1], kind: 'mix' }
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

/** A cada quantos dias entra um especial de artista. */
export const ARTIST_EVERY = 9

/**
 * Tema do dia e "rodada" (quantas vezes o tema já saiu antes). A rodada faz o tema andar pela lista de
 * músicas dele, para não repetir faixas até esgotar a lista.
 */
export function dailyTheme(number: number): { theme: Theme; round: number } {
  const n = Math.max(1, number)
  if (n % ARTIST_EVERY === 0) {
    const k = n / ARTIST_EVERY - 1
    const order = seededShuffle(ARTIST_THEMES, 'refrao-cruzado:artistas')
    return { theme: order[k % order.length], round: Math.floor(k / order.length) }
  }
  const k = n - 1 - Math.floor(n / ARTIST_EVERY)
  const order = seededShuffle(THEME_LIST, 'refrao-cruzado:temas')
  return { theme: order[k % order.length], round: Math.floor(k / order.length) }
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
  artistWord: { pt: 'Complete o nome de quem canta', en: "Fill in the artist's name" },
  bandWord: { pt: 'Complete o nome da banda', en: "Fill in the band's name" },
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

const fits = (answer: string) => answer.length >= 3 && answer.length <= WIDTH - 2

/** Perguntas que o tema faz sobre uma faixa (pode ser nenhuma). Avisa quando a resposta está em outro idioma. */
function questionsFor(t: TrackMeta, lang: Lang, theme: Theme): { answer: string; clue: string }[] {
  const out: { answer: string; clue: string }[] = []
  const add = (answer: string, clue: string) => {
    if (fits(answer)) out.push({ answer, clue })
  }
  // Nomes e títulos com algarismos (Maroon 5, blink-182) viram palavra cortada: ficam de fora.
  const word = (raw: string) => (/\d/.test(raw) ? '' : normalizeAnswer(raw))
  const titleNote = t.titleLang === 'en' ? T.english[lang] : t.titleLang === 'es' ? T.spanish[lang] : t.titleLang === 'pt' ? T.portuguese[lang] : ''
  const title = cleanTitle(t.song)
  const artist = mainArtist(t.artist)
  const isBand = (t.info?.members ?? 1) >= 2
  const whole = word(title)
  const words = title.split(/\s+/)
  const artistWords = artist.split(/\s+/)
  const fillTitle = (idx: number) => `${T.word[lang]}: “${words.map((w, i) => (i === idx ? '___' : w)).join(' ')}”${titleNote}`
  const kind = theme.kind

  // Palavra do tema no título ou no nome de quem canta.
  if (kind === 'word' || kind === 'world') {
    const lex = theme.words!
    if (lex.has(whole)) add(whole, T.title[lang] + titleNote)
    else if (words.length >= 2) {
      const idx = words.findIndex((w) => lex.has(word(w)))
      if (idx >= 0) add(word(words[idx]), fillTitle(idx))
    }
    if (artistWords.length >= 2) {
      const idx = artistWords.findIndex((w) => lex.has(word(w)))
      if (idx >= 0) {
        const shown = artistWords.map((w, i) => (i === idx ? '___' : w)).join(' ')
        add(word(artistWords[idx]), `${(isBand ? T.bandWord : T.artistWord)[lang]}: “${shown}”`)
      }
    }
    if (kind === 'word') return out
  }

  const country = () => {
    if (!t.info) return
    const c = countryAnswer(t.info.country, t.info.countryName, lang)
    if (c) add(c.answer, (c.abbr ? T.countryAbbr : T.country)[lang])
  }
  if (kind === 'world') {
    country()
    return out
  }

  const titleQs = () => {
    add(whole, T.title[lang] + titleNote)
    if (words.length >= 2) {
      const idx = words
        .map((w, i) => ({ i, a: word(w) }))
        .filter((x) => x.a.length >= 4)
        .sort((a, b) => b.a.length - a.a.length)[0]?.i
      if (idx !== undefined) add(word(words[idx]), fillTitle(idx))
    }
  }
  const full = word(artist)
  const nameQs = () => {
    add(full, (isBand ? T.band : T.artist)[lang])
    if (!isBand && artistWords.length === 2 && t.info && !NOT_FIRST_LAST.has(full)) {
      add(word(artistWords[0]), T.first[lang])
      add(word(artistWords[1]), T.last[lang])
    }
  }
  const members = () => {
    if (isBand && t.info && t.info.members <= 10) add(NUMBERS[lang][t.info.members], T.members[lang])
  }

  if (kind === 'titles') titleQs()
  else if (kind === 'names') nameQs()
  else if (kind === 'bands') {
    if (!isBand) return out
    add(full, T.band[lang])
    members()
    country()
  } else {
    // Miscelânea e especial de artista: perguntas de todo tipo.
    titleQs()
    nameQs()
    const genre = t.genre ? GENRE_ANSWER[t.genre] : undefined
    if (genre) add(genre[lang], T.genre[lang])
    country()
    members()
  }
  return out
}

/** Candidatos do tema, faixa a faixa, sem repetir resposta. */
export function buildCandidates(tracks: TrackMeta[], lang: Lang = 'pt', theme: Theme = THEMES[0]): Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()
  for (const t of tracks) {
    if (theme.kind === 'artist' && mainArtist(t.artist) !== theme.artist) continue
    for (const q of questionsFor(t, lang, theme)) {
      if (seen.has(q.answer)) continue
      seen.add(q.answer)
      out.push({ ...q, trackId: t.trackId })
    }
  }
  return out
}

/** Mínimo de faixas e de respostas diferentes no sorteio de palavras de cada dia. */
export const DAILY_TRACKS = 20

/**
 * Candidatos do dia: as faixas que rendem pergunta no tema, numa ordem fixa por tema, divididas em blocos de
 * pelo menos 20 faixas e 20 respostas diferentes (um bloco por rodada). Assim o tema só repete música depois
 * de passar pela lista toda. A mesma resposta pode vir de faixas diferentes; a grade usa só uma delas.
 */
export function dailyCandidates(tracks: TrackMeta[], lang: Lang, theme: Theme, round: number): Candidate[] {
  const blocks: Candidate[][] = []
  let block: Candidate[] = []
  let answers = new Set<string>()
  let count = 0
  for (const t of seededShuffle(tracks, `refrao-cruzado:${theme.id}`)) {
    if (theme.kind === 'artist' && mainArtist(t.artist) !== theme.artist) continue
    const qs = questionsFor(t, lang, theme)
    if (!qs.length) continue
    const mine = new Set<string>()
    for (const q of qs) {
      if (mine.has(q.answer)) continue
      mine.add(q.answer)
      answers.add(q.answer)
      block.push({ ...q, trackId: t.trackId })
    }
    count++
    if (count >= DAILY_TRACKS && answers.size >= DAILY_TRACKS) {
      blocks.push(block)
      block = []
      answers = new Set()
      count = 0
    }
  }
  // Sobra pequena vai para o último bloco.
  if (block.length) {
    if (blocks.length && count < DAILY_TRACKS / 2) blocks[blocks.length - 1].push(...block)
    else blocks.push(block)
  }
  return blocks.length ? blocks[round % blocks.length] : []
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

type Placed = Omit<PlacedWord, 'number' | 'color'>

/** Uma tentativa de montar a grade, com uma ordem de candidatos sorteada. Cada música e cada resposta entram uma vez só. */
function buildGrid(candidates: Candidate[], rand: () => number): { placed: Placed[]; crossings: number } {
  const grid = emptyGrid()
  const placed: Placed[] = []
  const usedTracks = new Set<string>()
  const usedAnswers = new Set<string>()
  const count = { across: 0, down: 0 }
  let crossings = 0
  // Começa por uma palavra comprida (rende mais cruzamentos), no meio da grade.
  const order = [...candidates]
  const first = order
    .map((c, i) => ({ i, score: c.answer.length + rand() * 3 }))
    .sort((a, b) => b.score - a.score)[0]
  if (!first) return { placed, crossings }
  const [head] = order.splice(first.i, 1)
  const x0 = Math.floor((WIDTH - head.answer.length) / 2)
  const y0 = Math.floor(HEIGHT / 2) - 1
  place(grid, head.answer, x0, y0, 'across')
  placed.push({ ...head, x: x0, y: y0, direction: 'across' })
  usedTracks.add(head.trackId)
  usedAnswers.add(head.answer)
  count.across++
  // Duas passadas: uma palavra que não cabia pode cruzar com as que entraram depois.
  for (let pass = 0; pass < 2; pass++) {
    for (const cand of order) {
      if (placed.length >= MAX_WORDS) break
      if (usedTracks.has(cand.trackId) || usedAnswers.has(cand.answer)) continue
      let best: { x: number; y: number; dir: Direction; score: number; c: number } | null = null
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          for (const dir of ['across', 'down'] as Direction[]) {
            const c = canPlace(grid, cand.answer, x, y, dir)
            if (c <= 0) continue
            // Mais cruzamentos primeiro; depois, a direção que está em falta.
            const mine = count[dir]
            const other = dir === 'across' ? count.down : count.across
            const score = c * 10 + (mine < other ? 6 : mine > other ? -4 : 0) + rand() * 2
            if (!best || score > best.score) best = { x, y, dir, score, c }
          }
        }
      }
      if (best) {
        place(grid, cand.answer, best.x, best.y, best.dir)
        placed.push({ ...cand, x: best.x, y: best.y, direction: best.dir })
        usedTracks.add(cand.trackId)
        usedAnswers.add(cand.answer)
        crossings += best.c
        count[best.dir]++
      }
    }
  }
  return { placed, crossings }
}

/** Nota de uma grade: mais palavras, mais cruzamentos e equilíbrio entre horizontais e verticais. */
export function gridScore(placed: Placed[], crossings: number): number {
  const across = placed.filter((w) => w.direction === 'across').length
  const down = placed.length - across
  return placed.length * 10 + crossings * 10 - Math.abs(across - down) * 8
}

/**
 * Gera a cruzadinha do dia: determinística para a mesma lista de candidatos e semente.
 * Faz várias tentativas e fica com a grade de melhor nota.
 */
export function generateCrossword(candidates: Candidate[], seed: string): PlacedWord[] | null {
  let best: { placed: Placed[]; crossings: number; score: number } | null = null
  for (let attempt = 0; attempt < 60; attempt++) {
    const rand = seededRandom(`${seed}#${attempt}`)
    const pool = seededShuffle(candidates, `${seed}#${attempt}`).slice(0, 60)
    const { placed, crossings } = buildGrid(pool, rand)
    if (placed.length < MIN_WORDS) continue
    const score = gridScore(placed, crossings)
    if (!best || score > best.score) best = { placed, crossings, score }
  }
  return best ? numberWords(best.placed) : null
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
