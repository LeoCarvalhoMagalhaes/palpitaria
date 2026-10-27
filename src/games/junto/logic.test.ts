import fs from 'node:fs'
import path from 'node:path'
import { countSolutions, matchGroup, nextHint, puzzleFor, shareText, validatePuzzle, type Puzzle } from './logic'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/junto/puzzles.json'), 'utf8'))
const puzzles: Puzzle[] = data.puzzles

describe('Juntô', () => {
  it('todos os quebra-cabeças são válidos e têm solução única', () => {
    for (const p of puzzles) expect([p.id, validatePuzzle(p)]).toEqual([p.id, []])
  })

  it('detecta quebra-cabeça com mais de uma solução', () => {
    const p = structuredClone(puzzles[0])
    // "rosa" e "violeta" cabem nos dois grupos: duas soluções.
    p.grupos[2].palavras[3] = 'violeta'
    p.grupos[1].palavras[3] = 'rosa'
    p.ambiguas = { rosa: [p.grupos[2].categoria], violeta: [p.grupos[1].categoria] }
    expect(countSolutions(p)).toBe(2)
  })

  it('confere grupos', () => {
    const p = puzzles[0]
    expect(matchGroup(p.grupos[0].palavras, p)?.nivel).toBe(1)
    expect(matchGroup([...p.grupos[0].palavras.slice(0, 3), p.grupos[1].palavras[0]], p)).toBeNull()
  })

  it('dicas seguem a ordem: 2 palavras do grupo mais fácil, depois 3', () => {
    const p = puzzles[0]
    const h1 = nextHint(p, [], [])
    expect(h1).toEqual(p.grupos.find((g) => g.nivel === 1)!.palavras.slice(0, 2))
    const h2 = nextHint(p, [], h1)
    expect(h2).toHaveLength(3)
    expect(nextHint(p, [], h2)).toBe(h2)
    expect(nextHint(p, [1], [])).toEqual(p.grupos.find((g) => g.nivel === 2)!.palavras.slice(0, 2))
    expect(nextHint(p, [1, 2, 3], [])).toEqual([])
  })

  it('compartilhamento em linhas de 10', () => {
    const text = shareText('Juntô', 4, [
      { kind: 'guess', nivel: null },
      { kind: 'hint' },
      { kind: 'guess', nivel: 1 },
      { kind: 'guess', nivel: 2 },
      { kind: 'guess', nivel: 4 },
      { kind: 'guess', nivel: 3 },
    ])
    expect(text).toBe('Joguei Juntô #4 e consegui em 5 tentativas e 1 dica\n❌💡🟧🟩🟪🟦')
  })

  it('seleção do dia circula pelos quebra-cabeças', () => {
    expect(puzzleFor(puzzles, 1).id).toBe(puzzles[0].id)
    expect(puzzleFor(puzzles, puzzles.length + 1).id).toBe(puzzles[0].id)
  })
})
