import fs from 'node:fs'
import path from 'node:path'
import { MIN_RATIO, ROUNDS, dailyRounds, displayName, formatValue, isRight, shareText, type Category } from './logic'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/mais-ou-menos/categories.json'), 'utf8'))
const categories: Category[] = data.categories

describe('Mais ou Menos', () => {
  it('as 5 categorias do original, com fonte, licença e itens suficientes', () => {
    expect(categories.map((c) => c.id)).toEqual(['wikipedia', 'spotify', 'filmes', 'precos', 'curiosidades'])
    for (const c of categories) {
      expect(c.items.length).toBeGreaterThan(100)
      expect(c.fonte).toBeTruthy()
      expect(c.licenca).toBeTruthy()
      for (const i of c.items) expect(i.value).toBeGreaterThan(0)
    }
    const trivia = categories.find((c) => c.groups)!
    for (const g of Object.keys(trivia.groups!)) expect(trivia.items.filter((i) => i.group === g).length).toBeGreaterThan(100)
  })

  it('rodadas determinísticas, sem empate apertado e do mesmo tipo', () => {
    for (let n = 1; n <= 365; n++) {
      const rounds = dailyRounds(categories, n)
      expect(rounds).toHaveLength(ROUNDS)
      for (const r of rounds) {
        const ratio = Math.max(r.left.value, r.right.value) / Math.min(r.left.value, r.right.value)
        expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO)
        expect(r.left.name).not.toBe(r.right.name)
        expect(r.left.group).toBe(r.right.group)
        expect(r.question).toBeTruthy()
      }
    }
    expect(dailyRounds(categories, 7)).toEqual(dailyRounds(categories, 7))
  })

  it('confere a escolha e formata valores', () => {
    const r = { left: { name: 'A', value: 10, emoji: '' }, right: { name: 'B', value: 20, emoji: '' } }
    expect(isRight(r, 'right')).toBe(true)
    expect(isRight(r, 'left')).toBe(false)
    expect(formatValue(12.5, '', 'US$ ', 2)).toBe('US$ 12,50')
    expect(formatValue(1234567, 'streams')).toBe('1.234.567 streams')
  })

  it('nomes com inicial maiúscula e compartilhamento', () => {
    expect(displayName('rio Amazonas')).toBe('Rio Amazonas')
    expect(shareText('Mais ou Menos', 1, [true, false, true, true, true])).toBe('Mais ou Menos #1 4/5\n✅❌✅✅✅')
  })
})
