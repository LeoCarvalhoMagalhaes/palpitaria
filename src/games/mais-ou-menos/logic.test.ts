import fs from 'node:fs'
import path from 'node:path'
import { MIN_RATIO, ROUNDS, dailyRounds, displayName, isRight, shareText, type Category } from './logic'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/mais-ou-menos/categories.json'), 'utf8'))
const categories: Category[] = data.categories

describe('Mais ou Menos', () => {
  it('5 categorias com fonte, licença e itens suficientes', () => {
    expect(categories).toHaveLength(ROUNDS)
    for (const c of categories) {
      expect(c.items.length).toBeGreaterThan(100)
      expect(c.fonte).toBeTruthy()
      expect(c.licenca).toBeTruthy()
      for (const i of c.items) expect(i.value).toBeGreaterThan(0)
    }
  })

  it('rodadas determinísticas, sem empate apertado', () => {
    for (let n = 1; n <= 365; n++) {
      const rounds = dailyRounds(categories, n)
      for (const r of rounds) {
        const ratio = Math.max(r.left.value, r.right.value) / Math.min(r.left.value, r.right.value)
        expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO)
        expect(r.left.name).not.toBe(r.right.name)
      }
    }
    expect(dailyRounds(categories, 7)).toEqual(dailyRounds(categories, 7))
  })

  it('confere a escolha', () => {
    const r = { category: categories[0], left: { name: 'A', value: 10, emoji: '' }, right: { name: 'B', value: 20, emoji: '' } }
    expect(isRight(r, 'right')).toBe(true)
    expect(isRight(r, 'left')).toBe(false)
  })

  it('nomes com inicial maiúscula e compartilhamento', () => {
    expect(displayName('rio Amazonas')).toBe('Rio Amazonas')
    expect(shareText('Mais ou Menos', 1, [true, false, true, true, true])).toBe('Mais ou Menos #1 4/5\n✅❌✅✅✅')
  })
})
