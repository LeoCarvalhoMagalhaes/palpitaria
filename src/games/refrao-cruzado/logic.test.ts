import { HEIGHT, MIN_WORDS, WIDTH, buildCandidates, cellsOf, generateCrossword, isCorrect, normalizeAnswer, solutionMap, timeBucket } from './logic'

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
