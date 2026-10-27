import fs from 'node:fs'
import path from 'node:path'
import { dailyWords, isCorrect, sentenceForSpeech, shareText, type Bank } from './logic'

const root = path.resolve(__dirname, '../../..')
const bank: Bank = JSON.parse(fs.readFileSync(path.join(root, 'public/data/letra-por-letra/words.json'), 'utf8')).niveis
const formsFile = path.join(root, 'scripts/.cache/words/forms.txt')

describe('Letra por Letra', () => {
  it('acentos e cedilha contam na grafia', () => {
    expect(isCorrect('Açúcar ', 'açúcar')).toBe(true)
    expect(isCorrect('acucar', 'açúcar')).toBe(false)
    expect(isCorrect('excessão', 'exceção')).toBe(false)
  })

  it('frase falada preenche a lacuna', () => {
    expect(sentenceForSpeech({ palavra: 'gelo', definicao: '', frase: 'O ___ derreteu.' })).toBe('O gelo derreteu.')
  })

  it('cinco palavras por dia, uma de cada nível', () => {
    const words = dailyWords(bank, 3)
    expect(words).toHaveLength(5)
    words.forEach((w, i) => expect(bank[String(i + 1) as keyof Bank]).toContain(w))
  })

  it('banco: frases com lacuna e grafias que existem no dicionário', () => {
    const forms = fs.existsSync(formsFile) ? new Set(fs.readFileSync(formsFile, 'utf8').split(/\r?\n/)) : null
    for (const lvl of Object.keys(bank) as (keyof Bank)[]) {
      expect(bank[lvl].length).toBeGreaterThanOrEqual(30)
      for (const e of bank[lvl]) {
        expect(e.frase).toContain('___')
        expect(e.definicao.length).toBeGreaterThan(5)
        if (forms) expect([e.palavra, forms.has(e.palavra)]).toEqual([e.palavra, true])
      }
    }
  })

  it('compartilhamento', () => {
    expect(shareText('Letra por Letra', 2, [true, true, false, true, false])).toBe('Letra por Letra #2 3/5\n🟩🟩🟥🟩🟥')
  })
})
