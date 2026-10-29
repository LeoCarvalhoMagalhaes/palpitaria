import fs from 'node:fs'
import path from 'node:path'
import {
  HEIGHT,
  MIN_WORDS,
  THEMES,
  WIDTH,
  buildCandidates,
  cellsOf,
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

  it.each(['pt', 'en'] as const)('todo tema rende cruzadinha (%s)', (lang) => {
    for (const theme of THEMES) {
      const themed = tracks.filter(theme.filter)
      expect(themed.length, theme.id).toBeGreaterThanOrEqual(8)
      const words = generateCrossword(buildCandidates(themed.slice(0, 60), lang, theme), `t:${theme.id}`)
      expect(words, theme.id).not.toBeNull()
    }
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

  it('tema do dia varia e é determinístico', () => {
    const ids = new Set(Array.from({ length: THEMES.length }, (_, i) => dailyTheme(i + 1).id))
    expect(ids.size).toBe(THEMES.length)
    expect(dailyTheme(5)).toBe(dailyTheme(5))
  })
})
