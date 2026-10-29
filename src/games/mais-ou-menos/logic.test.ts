import fs from 'node:fs'
import path from 'node:path'
import { DUELS_PER_CATEGORY, MIN_RATIO, ROUNDS, dailyRounds, displayName, formatValue, isRight, scoreBucket, shareText, type Category } from './logic'

const load = (file: string): Category[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../public/data/mais-ou-menos/${file}`), 'utf8')).categories

describe.each([
  ['pt', 'categories.json'],
  ['en', 'categories-en.json'],
])('Mais ou Menos (%s)', (_lang, file) => {
  const categories = load(file)

  it('as 5 categorias do original, com ícone, fonte, licença e imagem em todo item', () => {
    expect(categories.map((c) => c.id)).toEqual(['wikipedia', 'spotify', 'filmes', 'precos', 'curiosidades'])
    expect(categories.map((c) => c.icon)).toEqual(['search', 'music', 'film', 'tag', 'lightbulb'])
    for (const c of categories) {
      expect(c.items.length).toBeGreaterThan(100)
      expect(c.fonte).toBeTruthy()
      expect(c.licenca).toBeTruthy()
      for (const i of c.items) {
        expect(i.value).toBeGreaterThan(0)
        expect(Boolean(i.image?.src || i.appleId)).toBe(true)
      }
    }
    const trivia = categories.find((c) => c.groups)!
    for (const g of Object.keys(trivia.groups!)) expect(trivia.items.filter((i) => i.group === g).length).toBeGreaterThan(20)
  })

  it('25 duelos por dia, 5 por categoria, sem repetir item na categoria e sem empate apertado', () => {
    for (let n = 1; n <= 365; n++) {
      const rounds = dailyRounds(categories, n)
      expect(rounds).toHaveLength(ROUNDS)
      for (let c = 0; c < 5; c++) {
        const block = rounds.slice(c * DUELS_PER_CATEGORY, (c + 1) * DUELS_PER_CATEGORY)
        expect(new Set(block.map((r) => r.category.id)).size).toBe(1)
        const names = block.flatMap((r) => [r.left.name, r.right.name])
        expect(new Set(names).size).toBe(names.length)
      }
      for (const r of rounds) {
        const ratio = Math.max(r.left.value, r.right.value) / Math.min(r.left.value, r.right.value)
        expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO)
        expect(r.left.group).toBe(r.right.group)
        expect(r.question).toBeTruthy()
      }
    }
    expect(dailyRounds(categories, 7)).toEqual(dailyRounds(categories, 7))
  })
})

describe('Mais ou Menos: utilitários', () => {
  it('confere a escolha e formata valores', () => {
    const r = { left: { name: 'A', value: 10, emoji: '' }, right: { name: 'B', value: 20, emoji: '' } }
    expect(isRight(r, 'right')).toBe(true)
    expect(isRight(r, 'left')).toBe(false)
    expect(formatValue(12.5, '', 'US$ ', 2)).toBe('US$ 12,50')
    expect(formatValue(12.5, '', 'US$ ', 2, 'en')).toBe('$12.50')
    expect(formatValue(1234567, 'streams')).toBe('1.234.567 streams')
    expect(formatValue(1234567, 'streams', '', 0, 'en')).toBe('1,234,567 streams')
  })

  it('faixas de pontuação', () => {
    expect(scoreBucket(25)).toBe('25')
    expect(scoreBucket(20)).toBe('20–24')
    expect(scoreBucket(15)).toBe('15–19')
    expect(scoreBucket(14)).toBe('10–14')
    expect(scoreBucket(0)).toBe('0–9')
  })

  it('nomes com inicial maiúscula e compartilhamento em grade', () => {
    expect(displayName('rio Amazonas')).toBe('Rio Amazonas')
    const results = [true, true, false, true, true, ...Array(5).fill(true), ...Array(5).fill(false), ...Array(10).fill(true)]
    expect(shareText('Mais ou Menos', 1, results, ['search', 'music', 'film', 'tag', 'lightbulb'])).toBe(
      'Mais ou Menos #1 19/25\n🔎 🟩🟩🟥🟩🟩\n🎧 🟩🟩🟩🟩🟩\n🎬 🟥🟥🟥🟥🟥\n🏷️ 🟩🟩🟩🟩🟩\n💡 🟩🟩🟩🟩🟩',
    )
  })
})
