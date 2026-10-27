import fs from 'node:fs'
import path from 'node:path'
import { decodeRanks, dayFile, hintCost, hintTargetRank, metrics, type Entry } from './logic'

const dir = path.resolve(__dirname, '../../../public/data/rastro')

describe('Rastro', () => {
  it('custo da dica nas faixas observadas', () => {
    expect(hintCost(1)).toBe(0)
    expect(hintCost(2)).toBe(3)
    expect(hintCost(159)).toBe(3)
    expect(hintCost(160)).toBe(5)
    expect(hintCost(999)).toBe(5)
    expect(hintCost(1000)).toBe(7)
  })

  it('tentativas somam o custo das dicas', () => {
    const e: Entry[] = [
      { word: 'a', rank: 5000, isHint: false },
      { word: 'b', rank: 400, isHint: true },
      { word: 'c', rank: 1, isHint: false },
    ]
    expect(metrics(e)).toEqual({ guessCount: 7, hintCount: 1 })
  })

  it('dica no meio do caminho', () => {
    expect(hintTargetRank([])).toBe(1000)
    expect(hintTargetRank([{ word: 'x', rank: 300, isHint: false }])).toBe(150)
    expect(hintTargetRank([{ word: 'x', rank: 3, isHint: false }])).toBe(2)
  })

  it('arquivos do dia circulam', () => {
    expect(dayFile(1, 90)).toBe('rastro/day-001.json')
    expect(dayFile(91, 90)).toBe('rastro/day-001.json')
  })

  it.skipIf(!fs.existsSync(path.join(dir, 'vocab.json')))('dados: a resposta é a posição 1 e o ranking é uma permutação', () => {
    const vocab = JSON.parse(fs.readFileSync(path.join(dir, 'vocab.json'), 'utf8'))
    expect(vocab.days).toBeGreaterThanOrEqual(60)
    const day = JSON.parse(fs.readFileSync(path.join(dir, 'day-001.json'), 'utf8'))
    const ranks = decodeRanks(day.ranks)
    expect(ranks.length).toBe(vocab.words.length)
    expect(ranks[vocab.words.indexOf(day.answer)]).toBe(1)
    expect(new Set(ranks).size).toBe(Math.min(ranks.length, 65535))
  })
})
