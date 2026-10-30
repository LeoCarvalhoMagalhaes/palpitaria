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
  /** Tipo de pergunta (título, quem canta, país…): a grade limita quantas vezes cada tipo aparece. */
  kind?: string
  /** Outras formas de fazer a mesma pergunta, para a grade não repetir a frase. */
  variants?: string[]
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
  info?: { gender: string; members: number; country: string; countryName: string; continent?: string } | null
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
  /** O que a palavra escondida é, para a pista ("Que cor falta no título…?"). */
  noun?: [string, string]
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
  { id: 'cores', pt: 'Cores', en: 'Colors', kind: 'word', words: WORDS.cores, noun: ['cor', 'color'] },
  { id: 'numeros', pt: 'Números', en: 'Numbers', kind: 'word', words: WORDS.numeros, noun: ['número', 'number'] },
  { id: 'corpo', pt: 'Corpo humano', en: 'The human body', kind: 'word', words: WORDS.corpo, noun: ['parte do corpo', 'body part'] },
  { id: 'natureza', pt: 'Natureza e clima', en: 'Nature and weather', kind: 'word', words: WORDS.natureza, noun: ['palavra da natureza', 'nature word'] },
  { id: 'tempo', pt: 'Dias, noites e tempo', en: 'Days, nights and time', kind: 'word', words: WORDS.tempo, noun: ['palavra de tempo', 'time word'] },
  { id: 'sentimentos', pt: 'Amor e sentimentos', en: 'Love and feelings', kind: 'word', words: WORDS.sentimentos, noun: ['sentimento', 'feeling'] },
  { id: 'gente', pt: 'Gente: família, amigos e realeza', en: 'People: family, friends and royalty', kind: 'word', words: WORDS.gente, noun: ['pessoa', 'person'] },
  { id: 'movimento', pt: 'Dança e movimento', en: 'Dance and motion', kind: 'word', words: WORDS.movimento, noun: ['movimento', 'motion word'] },
  { id: 'mundo', pt: 'Pelo mundo', en: 'Around the world', kind: 'world', words: WORDS.lugares, noun: ['lugar', 'place'] },
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

type Phrases = Record<Lang, string[]>

/** Cada tipo de pergunta tem várias formas; `{s}` é o título ou nome com a lacuna. */
const Q: Record<string, Phrases> = {
  title: {
    pt: ['Nome desta música', 'Qual é esta música?', 'Título desta faixa', 'Que música está tocando?'],
    en: ['Title of this song', 'Name this song', 'Which song is this?', 'Title of this track'],
  },
  fill: {
    pt: ['Complete o título: “{s}”', 'Qual palavra falta no título “{s}”?', 'Falta uma palavra: “{s}”', 'Termine o título: “{s}”'],
    en: ['Fill in the title: “{s}”', 'Which word is missing from “{s}”?', 'Missing word: “{s}”', 'Finish the title: “{s}”'],
  },
  firstWord: {
    pt: ['Primeira palavra do título desta música', 'Como começa o título desta música? (1ª palavra)'],
    en: ['First word of this song’s title', 'How does this title start? (first word)'],
  },
  lastWord: {
    pt: ['Última palavra do título desta música', 'Como termina o título desta música? (última palavra)'],
    en: ['Last word of this song’s title', 'How does this title end? (last word)'],
  },
  artist: {
    pt: ['Quem canta este trecho?', 'De quem é esta voz?', 'Quem está cantando?', 'Artista desta faixa'],
    en: ['Who sings this?', 'Whose voice is this?', 'Who is singing?', 'Artist on this track'],
  },
  band: {
    pt: ['Que banda é esta?', 'Nome da banda deste trecho', 'Que grupo toca esta música?', 'Banda desta faixa'],
    en: ['Which band is this?', 'Name the band', 'Which group plays this?', 'Band behind this track'],
  },
  nameFill: {
    pt: ['Complete o nome de quem canta: “{s}”', 'Falta uma palavra no nome: “{s}”', 'Que palavra completa o nome “{s}”?'],
    en: ["Fill in the artist's name: “{s}”", 'Missing word in the name: “{s}”', 'Which word completes “{s}”?'],
  },
  bandFill: {
    pt: ['Complete o nome da banda: “{s}”', 'Falta uma palavra no nome da banda: “{s}”', 'Que palavra completa a banda “{s}”?'],
    en: ["Fill in the band's name: “{s}”", "Missing word in the band's name: “{s}”", 'Which word completes the band “{s}”?'],
  },
  first: {
    pt: ['Primeiro nome de quem canta', 'Nome (sem o sobrenome) de quem canta', 'Como se chama quem canta? (só o primeiro nome)'],
    en: ["The singer's first name", "Singer's first name (no surname)", 'What is the singer called? (first name only)'],
  },
  last: {
    pt: ['Sobrenome de quem canta', 'Último nome de quem canta', 'Sobrenome desta voz'],
    en: ["The singer's last name", "Singer's surname", 'Surname behind this voice'],
  },
  genre: {
    pt: ['Gênero musical desta faixa', 'Estilo desta música', 'Que gênero é este?'],
    en: ['Music genre of this track', 'Style of this song', 'Which genre is this?'],
  },
  country: {
    pt: [
      'País de origem de quem canta',
      'De que país vem quem canta?',
      'Terra natal de quem canta',
      'Nacionalidade de quem canta (o país)',
      'Em que país começou a carreira desta voz?',
      'Este trecho vem de que país?',
    ],
    en: [
      'Home country of this artist',
      'Which country is this artist from?',
      "This artist's homeland",
      'Country this artist comes from',
      "Where did this artist's career begin? (country)",
      'Which country does this track come from?',
    ],
  },
  continent: {
    pt: ['Continente de origem de quem canta', 'De que continente vem quem canta?', 'Este trecho vem de que continente?'],
    en: ["This artist's home continent", 'Which continent is this artist from?', 'Which continent does this track come from?'],
  },
  language: {
    pt: ['Em que idioma é o título desta música?', 'Idioma do título desta faixa', 'Língua do título deste trecho'],
    en: ["Which language is this song's title in?", 'Language of this title', 'Which language is this title?'],
  },
  members: {
    pt: ['Quantos integrantes tem esta banda? (por extenso)', 'Número de membros da banda (por extenso)', 'Quantas pessoas formam esta banda? (por extenso)'],
    en: ['How many members does this band have? (spelled out)', 'Number of band members (spelled out)', 'How many people are in this band? (spelled out)'],
  },
}

const NOTE = {
  english: { pt: ' (em inglês)', en: '' },
  spanish: { pt: ' (em espanhol)', en: ' (in Spanish)' },
  portuguese: { pt: '', en: ' (in Portuguese)' },
  abbr: { pt: ' (sigla)', en: ' (abbreviation)' },
}

const fits = (answer: string) => answer.length >= 3 && answer.length <= WIDTH - 2

/** Continentes que cabem na grade ("América do Norte" e "do Sul" não cabem). */
const CONTINENT: Record<string, Record<Lang, string>> = {
  Europa: { pt: 'EUROPA', en: 'EUROPE' },
  'Ásia': { pt: 'ASIA', en: 'ASIA' },
  Oceania: { pt: 'OCEANIA', en: 'OCEANIA' },
  'África': { pt: 'AFRICA', en: 'AFRICA' },
}

const LANGUAGE: Record<string, Record<Lang, string>> = {
  en: { pt: 'INGLES', en: 'ENGLISH' },
  es: { pt: 'ESPANHOL', en: 'SPANISH' },
  pt: { pt: 'PORTUGUES', en: 'PORTUGUESE' },
}

/** Perguntas que o tema faz sobre uma faixa (pode ser nenhuma). Avisa quando a resposta está em outro idioma. */
function questionsFor(t: TrackMeta, lang: Lang, theme: Theme): Omit<Candidate, 'trackId'>[] {
  const out: Omit<Candidate, 'trackId'>[] = []
  /** Pergunta do tipo `kind`, com todas as formas dele (a primeira vira a pista padrão). */
  const add = (answer: string, kind: string, opts: { s?: string; note?: string; extra?: string[] } = {}) => {
    if (!fits(answer)) return
    const phrases = [...(opts.extra ?? []), ...Q[kind][lang]].map((f) => f.replace('{s}', opts.s ?? '') + (opts.note ?? ''))
    out.push({ answer, clue: phrases[0], kind, variants: phrases })
  }
  // Nomes e títulos com algarismos (Maroon 5, blink-182) viram palavra cortada: ficam de fora.
  const word = (raw: string) => (/\d/.test(raw) ? '' : normalizeAnswer(raw))
  const titleNote = t.titleLang === 'en' ? NOTE.english[lang] : t.titleLang === 'es' ? NOTE.spanish[lang] : t.titleLang === 'pt' ? NOTE.portuguese[lang] : ''
  const title = cleanTitle(t.song)
  const artist = mainArtist(t.artist)
  const isBand = (t.info?.members ?? 1) >= 2
  const whole = word(title)
  const words = title.split(/\s+/)
  const artistWords = artist.split(/\s+/)
  const gap = (list: string[], idx: number) => list.map((w, i) => (i === idx ? '___' : w)).join(' ')
  const kind = theme.kind

  // Palavra do tema no título ou no nome de quem canta.
  if (kind === 'word' || kind === 'world') {
    const lex = theme.words!
    const noun = theme.noun?.[lang === 'en' ? 1 : 0]
    const Noun = noun ? noun.charAt(0).toUpperCase() + noun.slice(1) : ''
    const themed = noun
      ? lang === 'en'
        ? [`Which ${noun} is missing from “{s}”?`, `${Noun} missing here: “{s}”`]
        : [`Que ${noun} falta no título “{s}”?`, `${Noun} que falta: “{s}”`]
      : []
    if (lex.has(whole)) add(whole, 'title', { note: titleNote })
    else if (words.length >= 2) {
      const idx = words.findIndex((w) => lex.has(word(w)))
      if (idx >= 0) add(word(words[idx]), 'fill', { s: gap(words, idx), note: titleNote, extra: themed })
    }
    if (artistWords.length >= 2) {
      const idx = artistWords.findIndex((w) => lex.has(word(w)))
      if (idx >= 0) add(word(artistWords[idx]), isBand ? 'bandFill' : 'nameFill', { s: gap(artistWords, idx) })
    }
    if (kind === 'word') return out
  }

  const country = () => {
    if (!t.info) return
    const c = countryAnswer(t.info.country, t.info.countryName, lang)
    if (c) add(c.answer, 'country', { note: c.abbr ? NOTE.abbr[lang] : '' })
  }
  const continent = () => {
    const c = t.info?.continent ? CONTINENT[t.info.continent] : undefined
    if (c) add(c[lang], 'continent')
  }
  const language = () => {
    const l = t.titleLang ? LANGUAGE[t.titleLang] : undefined
    if (l) add(l[lang], 'language')
  }
  if (kind === 'world') {
    country()
    continent()
    language()
    return out
  }

  const titleQs = (edges: boolean) => {
    add(whole, 'title', { note: titleNote })
    if (words.length >= 2) {
      const idx = words
        .map((w, i) => ({ i, a: word(w) }))
        .filter((x) => x.a.length >= 4)
        .sort((a, b) => b.a.length - a.a.length)[0]?.i
      if (idx !== undefined) add(word(words[idx]), 'fill', { s: gap(words, idx), note: titleNote })
    }
    if (edges && words.length >= 3) {
      add(word(words[0]), 'firstWord', { note: titleNote })
      add(word(words[words.length - 1]), 'lastWord', { note: titleNote })
    }
  }
  const full = word(artist)
  const nameQs = () => {
    add(full, isBand ? 'band' : 'artist')
    if (!isBand && artistWords.length === 2 && t.info && !NOT_FIRST_LAST.has(full)) {
      add(word(artistWords[0]), 'first')
      add(word(artistWords[1]), 'last')
    }
    // Nome com 2+ palavras (bandas) ou 3+ (artistas): esconde a palavra mais comprida.
    if (artistWords.length >= (isBand ? 2 : 3)) {
      const idx = artistWords
        .map((w, i) => ({ i, a: word(w) }))
        .filter((x) => x.a.length >= 3)
        .sort((a, b) => b.a.length - a.a.length)[0]?.i
      if (idx !== undefined) add(word(artistWords[idx]), isBand ? 'bandFill' : 'nameFill', { s: gap(artistWords, idx) })
    }
  }
  const members = () => {
    if (isBand && t.info && t.info.members <= 10) add(NUMBERS[lang][t.info.members], 'members')
  }
  const genre = () => {
    const g = t.genre ? GENRE_ANSWER[t.genre] : undefined
    if (g) add(g[lang], 'genre')
  }

  if (kind === 'titles') titleQs(true)
  else if (kind === 'names') {
    nameQs()
    country()
  } else if (kind === 'bands') {
    if (!isBand) return out
    nameQs()
    members()
    country()
    titleQs(false)
    genre()
  } else {
    // Miscelânea e especial de artista: perguntas de todo tipo.
    titleQs(true)
    nameQs()
    genre()
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

/**
 * Uma tentativa de montar a grade, com uma ordem de candidatos sorteada. Cada música e cada resposta entram uma
 * vez só, e cada tipo de pergunta no máximo `maxPerKind` vezes.
 */
function buildGrid(candidates: Candidate[], rand: () => number, maxPerKind: number): { placed: Placed[]; crossings: number } {
  const grid = emptyGrid()
  const placed: Placed[] = []
  const usedTracks = new Set<string>()
  const usedAnswers = new Set<string>()
  const kinds = new Map<string, number>()
  const kindFull = (c: Candidate) => !!c.kind && (kinds.get(c.kind) ?? 0) >= maxPerKind
  const useKind = (c: Candidate) => c.kind && kinds.set(c.kind, (kinds.get(c.kind) ?? 0) + 1)
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
  useKind(head)
  count.across++
  // A cada passo entra, entre todas as candidatas, a que cruza mais (com um pouco de sorteio para variar).
  while (placed.length < MAX_WORDS) {
    let best: { cand: Candidate; x: number; y: number; dir: Direction; score: number; c: number } | null = null
    for (const cand of order) {
      if (usedTracks.has(cand.trackId) || usedAnswers.has(cand.answer) || kindFull(cand)) continue
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          for (const dir of ['across', 'down'] as Direction[]) {
            const c = canPlace(grid, cand.answer, x, y, dir)
            if (c <= 0) continue
            // Mais cruzamentos primeiro; depois, a direção que está em falta.
            const mine = count[dir]
            const other = dir === 'across' ? count.down : count.across
            const score = c * 10 + (mine < other ? 6 : mine > other ? -4 : 0) + rand() * 5
            if (!best || score > best.score) best = { cand, x, y, dir, score, c }
          }
        }
      }
    }
    if (!best) break
    place(grid, best.cand.answer, best.x, best.y, best.dir)
    placed.push({ ...best.cand, x: best.x, y: best.y, direction: best.dir })
    usedTracks.add(best.cand.trackId)
    usedAnswers.add(best.cand.answer)
    useKind(best.cand)
    crossings += best.c
    count[best.dir]++
  }
  return { placed, crossings }
}

/** Nota de uma grade: mais palavras, mais cruzamentos, mais tipos de pergunta e equilíbrio entre horizontais e verticais. */
export function gridScore(placed: Placed[], crossings: number): number {
  const across = placed.filter((w) => w.direction === 'across').length
  const down = placed.length - across
  const kinds = new Set(placed.map((w) => w.kind)).size
  return placed.length * 10 + crossings * 10 + kinds * 6 - Math.abs(across - down) * 8
}

/** Troca a pista de cada palavra por uma forma ainda não usada na grade (mesmo tipo de pergunta, outra frase). */
function varyClues(placed: Placed[], seed: string): Placed[] {
  const rand = seededRandom(`${seed}#frases`)
  const used = new Map<string, number>()
  const offset = new Map<string, number>()
  return placed.map(({ variants, ...w }) => {
    if (!variants?.length || !w.kind) return w
    if (!offset.has(w.kind)) offset.set(w.kind, Math.floor(rand() * variants.length))
    const n = used.get(w.kind) ?? 0
    used.set(w.kind, n + 1)
    return { ...w, clue: variants[(offset.get(w.kind)! + n) % variants.length] }
  })
}

/** Quantas vezes o mesmo tipo de pergunta pode aparecer numa grade (sobe só se a grade não fechar). */
export const KIND_LIMITS = [2, 3, Infinity]

/**
 * Gera a cruzadinha do dia: determinística para a mesma lista de candidatos e semente.
 * Faz várias tentativas e fica com a grade de melhor nota; cada tipo de pergunta aparece no máximo 2 vezes
 * (3 ou sem limite só quando o tema não tem variedade suficiente) e nenhuma frase se repete.
 */
export function generateCrossword(candidates: Candidate[], seed: string): PlacedWord[] | null {
  let fallback: { placed: Placed[]; score: number } | null = null
  for (const limit of KIND_LIMITS) {
    let best: { placed: Placed[]; score: number } | null = null
    for (let attempt = 0; attempt < 40; attempt++) {
      const rand = seededRandom(`${seed}#${attempt}`)
      const pool = seededShuffle(candidates, `${seed}#${attempt}`).slice(0, 40)
      const { placed, crossings } = buildGrid(pool, rand, limit)
      if (placed.length < MIN_WORDS) continue
      const score = gridScore(placed, crossings)
      if (!best || score > best.score) best = { placed, score }
    }
    // Fica com o menor limite que já rende uma grade boa (7+ palavras).
    if (best && best.placed.length >= MAX_WORDS - 1) return numberWords(varyClues(best.placed, seed))
    if (best && (!fallback || best.placed.length > fallback.placed.length)) fallback = best
  }
  return fallback ? numberWords(varyClues(fallback.placed, seed)) : null
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
