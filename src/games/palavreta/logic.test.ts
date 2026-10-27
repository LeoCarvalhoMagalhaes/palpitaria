import fs from 'node:fs'
import path from 'node:path'
import { dailyAnswer, decodeChallenge, encodeChallenge, fold, hardModeViolation, keyboardStates, scoreGuess, shareText } from './logic'

describe('Palavreta', () => {
  it('pontua letras certas, deslocadas e ausentes', () => {
    expect(scoreGuess('carro', 'corda')).toEqual(['hit', 'near', 'hit', 'miss', 'near'])
  })

  it('não dá amarelo a mais em letras repetidas', () => {
    // "sabor" tem um A e um S só: o segundo S e o segundo A de "assar" ficam sem cor.
    expect(scoreGuess('assar', 'sabor')).toEqual(['near', 'near', 'miss', 'miss', 'hit'])
    // verde tem prioridade sobre amarelo
    expect(scoreGuess('aaaab', 'bbbba')).toEqual(['near', 'miss', 'miss', 'miss', 'near'])
  })

  it('ignora acentos e cedilha', () => {
    expect(scoreGuess('praca', 'praça')).toEqual(['hit', 'hit', 'hit', 'hit', 'hit'])
    expect(fold('Órgão')).toBe('orgao')
  })

  it('modo difícil exige verdes no lugar e amarelos presentes', () => {
    const prev = [{ word: 'carro', score: scoreGuess('carro', 'corda') }]
    expect(hardModeViolation('corda', prev)).toBeNull()
    expect(hardModeViolation('bolsa', prev)).toMatch(/1ª letra/)
    expect(hardModeViolation('cxrxx', prev)).toMatch(/letra/)
  })

  it('teclado guarda o melhor estado', () => {
    const g = [
      { word: 'carro', score: scoreGuess('carro', 'corda') },
      { word: 'corda', score: scoreGuess('corda', 'corda') },
    ]
    expect(keyboardStates(g).o).toBe('hit')
  })

  it('desafio personalizado ida e volta', () => {
    const code = encodeChallenge('limão')
    expect(code).not.toContain('limao')
    expect(decodeChallenge(code)).toBe('limao')
    expect(decodeChallenge('!!!')).toBeNull()
  })

  it('compartilhamento', () => {
    const s = [scoreGuess('carro', 'corda'), scoreGuess('corda', 'corda')]
    expect(shareText('Palavreta', '#3', s, true, '')).toBe('Palavreta #3 2/6\n🟩🟨🟩🟥🟨\n🟩🟩🟩🟩🟩')
  })

  it('base de palavras: respostas válidas e um ano sem repetir', () => {
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/palavreta/words.json'), 'utf8'))
    const valid = new Set<string>(data.valid)
    expect(data.answers.length).toBeGreaterThanOrEqual(365)
    for (const a of data.answers) expect(valid.has(fold(a))).toBe(true)
    const year = new Set(Array.from({ length: 365 }, (_, i) => dailyAnswer(data.answers, i + 1)))
    expect(year.size).toBe(365)
  })
})
