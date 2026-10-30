import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIST_EVERY,
  HEIGHT,
  MIN_WORDS,
  THEMES,
  WIDTH,
  buildCandidates,
  cellsOf,
  dailyCandidates,
  dailyTheme,
  generateCrossword,
  isCorrect,
  mainArtist,
  normalizeAnswer,
  solutionMap,
  timeBucket,
  type TrackMeta,
} from './logic'

const tracks = [
  ['Legião Urbana', 'Tempo Perdido'],
  ['Titãs', 'Epitáfio'],
  ['Skank', 'Garota Nacional'],
  ['Kid Abelha', 'Fixação'],
  ['Barão Vermelho', 'Pro Dia Nascer Feliz'],
  ['Cazuza', 'Exagerado'],
  ['Capital Inicial', 'Primeiros Erros'],
  ['Engenheiros do Hawaii', 'Infinita Highway'],
  ['Paralamas', 'Lanterna dos Afogados'],
  ['Pitty', 'Admirável Chip Novo'],
].map(([artist, song], index) => ({ artist, song, trackId: `t${index}` }))

describe('Refrão Cruzado', () => {
  it('normaliza respostas como numa cruzadinha', () => {
    expect(normalizeAnswer('Legião Urbana')).toBe('LEGIAOURBANA')
    expect(normalizeAnswer("Pro Dia Nascer Feliz!")).toBe('PRODIANASCERFELIZ')
  })

  it('gera grade válida, dentro dos limites e com cruzamentos coerentes', () => {
    const cands = buildCandidates(tracks)
    const words = generateCrossword(cands, '2026-10-27')!
    expect(words).not.toBeNull()
    expect(words.length).toBeGreaterThanOrEqual(MIN_WORDS)
    const seen = new Map<string, string>()
    for (const w of words) {
      cellsOf(w).forEach(([x, y], i) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(WIDTH)
        expect(y).toBeLessThan(HEIGHT)
        const k = `${x},${y}`
        if (seen.has(k)) expect(seen.get(k)).toBe(w.answer[i])
        seen.set(k, w.answer[i])
      })
    }
    // Toda palavra (menos a primeira) cruza com outra.
    const counts = new Map<string, number>()
    for (const w of words) for (const [x, y] of cellsOf(w)) counts.set(`${x},${y}`, (counts.get(`${x},${y}`) ?? 0) + 1)
    for (const w of words.slice(1)) expect(cellsOf(w).some(([x, y]) => counts.get(`${x},${y}`)! > 1)).toBe(true)
  })

  it('é determinística', () => {
    const c = buildCandidates(tracks)
    expect(generateCrossword(c, 'x')).toEqual(generateCrossword(c, 'x'))
  })

  it('confere a solução', () => {
    const words = generateCrossword(buildCandidates(tracks), 'y')!
    const sol = Object.fromEntries(solutionMap(words))
    expect(isCorrect(words, sol)).toBe(true)
    const wrong = { ...sol, [Object.keys(sol)[0]]: 'Q' }
    expect(isCorrect(words, wrong)).toBe(false)
  })

  it('faixas de tempo', () => {
    expect(timeBucket(120)).toBe('≤2min')
    expect(timeBucket(121)).toBe('≤5min')
    expect(timeBucket(601)).toBe('10+min')
  })
})

describe('Refrão Cruzado: temas e pistas', () => {
  const root = path.resolve(__dirname, '../../../public/data')
  const songs = JSON.parse(fs.readFileSync(`${root}/musicas/songs.json`, 'utf8')).songs as {
    artist: string
    title: string
    appleId: number | null
    year: number | null
    genre: string | null
    titleLang?: string
  }[]
  const artists = JSON.parse(fs.readFileSync(`${root}/holofote/artists.json`, 'utf8')).artists as {
    name: string
    gender: string
    members: number
    country: string
    countryName: string
  }[]
  const fold = (s: string) => normalizeAnswer(s)
  const byName = new Map(artists.map((a) => [fold(a.name), a]))
  const tracks: TrackMeta[] = songs
    .filter((s) => s.appleId)
    .map((s) => ({ artist: s.artist, song: s.title, trackId: String(s.appleId), year: s.year, genre: s.genre, titleLang: s.titleLang, info: byName.get(fold(mainArtist(s.artist))) ?? null }))

  it.each(['pt', 'en'] as const)('todo tema rende cruzadinha, em várias rodadas (%s)', (lang) => {
    for (const theme of THEMES) {
      for (const round of [0, 1, 5]) {
        const words = generateCrossword(dailyCandidates(tracks, lang, theme, round), `t:${theme.id}:${round}`)
        expect(words, `${theme.id} rodada ${round}`).not.toBeNull()
        // Uma música por palavra, sem resposta repetida.
        expect(new Set(words!.map((w) => w.trackId)).size, theme.id).toBe(words!.length)
        expect(new Set(words!.map((w) => w.answer)).size, theme.id).toBe(words!.length)
      }
    }
  })

  it('nos temas de palavras, toda resposta é do tema', () => {
    const cores = THEMES.find((t) => t.id === 'cores')!
    const cands = dailyCandidates(tracks, 'pt', cores, 0)
    expect(cands.length).toBeGreaterThanOrEqual(10)
    for (const c of cands) expect(cores.words!.has(c.answer), c.answer).toBe(true)
  })

  it('grades com cruzamentos e equilíbrio entre horizontais e verticais', () => {
    let words = 0
    let crossings = 0
    for (let n = 1; n <= 40; n++) {
      const { theme, round } = dailyTheme(n)
      const grid = generateCrossword(dailyCandidates(tracks, 'pt', theme, round), `d:${n}`)!
      const across = grid.filter((w) => w.direction === 'across').length
      expect(Math.min(across, grid.length - across), `dia ${n}`).toBeGreaterThanOrEqual(2)
      const count = new Map<string, number>()
      for (const w of grid) for (const [x, y] of cellsOf(w)) count.set(`${x},${y}`, (count.get(`${x},${y}`) ?? 0) + 1)
      crossings += [...count.values()].filter((v) => v > 1).length
      words += grid.length
    }
    expect(crossings / words).toBeGreaterThanOrEqual(1)
  })

  it('um tema não repete música nas rodadas seguintes', () => {
    const theme = THEMES.find((t) => t.id === 'misto')!
    const ids = (round: number) => new Set(generateCrossword(dailyCandidates(tracks, 'pt', theme, round), `r:${round}`)!.map((w) => w.trackId))
    const a = ids(0)
    const later = [1, 2, 3].flatMap((r) => [...ids(r)])
    expect(later.filter((id) => a.has(id))).toEqual([])
  })

  it('avisa o idioma e usa pistas variadas', () => {
    const cands = buildCandidates(tracks.slice(0, 80), 'pt')
    const kinds = new Set(cands.map((c) => c.clue.replace(/[:(“].*$/, '').trim()))
    expect(kinds.size).toBeGreaterThanOrEqual(6)
    expect(cands.some((c) => c.clue.includes('(em inglês)'))).toBe(true)
    const en = buildCandidates(tracks, 'en')
    expect(en.some((c) => c.clue.includes('(in Spanish)'))).toBe(true)
    expect(en.every((c) => !c.clue.includes('(em'))).toBe(true)
    for (const c of [...cands, ...en]) expect(c.answer).toMatch(/^[A-Z]{3,10}$/)
    if (process.env.SHOW_CLUES) for (const c of [...cands.slice(0, 40), ...en.slice(0, 25)]) console.log(c.answer.padEnd(12), c.clue)
  })

  it('tema do dia varia, é determinístico e o especial de artista é só de vez em quando', () => {
    const days = Array.from({ length: 120 }, (_, i) => dailyTheme(i + 1))
    expect(new Set(days.map((d) => d.theme.id)).size).toBeGreaterThanOrEqual(THEMES.length - 5)
    const specials = days.filter((d) => d.theme.kind === 'artist').length
    expect(specials).toBe(Math.floor(120 / ARTIST_EVERY))
    expect(dailyTheme(5)).toEqual(dailyTheme(5))
  })
})
