import fs from 'node:fs'
import path from 'node:path'
import { DUELS_PER_CATEGORY, ROUNDS, dailyRounds, distinct, winnerOf, displayName, formatValue, isRight, scoreBucket, shareText, type Category } from './logic'

const load = (file: string): Category[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../public/data/mais-ou-menos/${file}`), 'utf8')).categories

describe.each([
  ['pt', 'categories.json'],
  ['en', 'categories-en.json'],
])('Mais ou Menos (%s)', (_lang, file) => {
  const categories = load(file)

  it('as 5 categorias, com ícone, fonte, licença e imagem em todo item', () => {
    expect(categories.map((c) => c.id)).toEqual(['wikipedia', 'spotify', 'filmes', 'precos', 'curiosidades'])
    expect(categories.map((c) => c.icon)).toEqual(['search', 'music', 'film', 'tag', 'lightbulb'])
    for (const c of categories) {
      expect(c.items.length).toBeGreaterThan(100)
      expect(c.fonte).toBeTruthy()
      expect(c.licenca).toBeTruthy()
      for (const i of c.items) {
        expect(i.value).toBeGreaterThan(0)
        expect(Boolean(i.image?.src)).toBe(true)
      }
    }
    for (const c of categories.filter((c) => c.mix)) {
      expect(new Set(c.items.map((i) => i.group)).size).toBeGreaterThanOrEqual(8)
      for (const i of c.items) expect(i.detail).toBeTruthy()
    }
  })

  it('25 duelos por dia; quem tem mais continua e uma opção nova entra, sem empate apertado', () => {
    let newWins = 0
    for (let n = 1; n <= 365; n++) {
      const rounds = dailyRounds(categories, n)
      expect(rounds).toHaveLength(ROUNDS)
      for (let c = 0; c < 5; c++) {
        const block = rounds.slice(c * DUELS_PER_CATEGORY, (c + 1) * DUELS_PER_CATEGORY)
        expect(new Set(block.map((r) => r.category.id)).size).toBe(1)
        const names = [block[0].left.name, ...block.map((r) => r.right.name)]
        expect(new Set(names).size).toBe(names.length)
        for (let d = 1; d < block.length; d++) expect(block[d].left).toBe(winnerOf(block[d - 1]))
        // Nas categorias misturadas, os 6 itens do dia são de tipos diferentes.
        if (block[0].category.mix) expect(new Set([block[0].left.group, ...block.map((r) => r.right.group)]).size).toBe(6)
      }
      for (const r of rounds) {
        expect(distinct(r.left.value, r.right.value, r.category)).toBe(true)
        expect(r.question).toBeTruthy()
        if (r.right.value > r.left.value) newWins++
      }
    }
    // O lado certo não é previsível: a opção nova ganha perto de metade das vezes.
    const share = newWins / (365 * ROUNDS)
    expect(share).toBeGreaterThan(0.4)
    expect(share).toBeLessThan(0.6)
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
    expect(formatValue(123456, 'km')).toBe('123.456 km')
    expect(formatValue(1234567, 'streams')).toBe('1,23 milhão de streams')
    expect(formatValue(1234567, 'streams', '', 0, 'en')).toBe('1.23 million streams')
    expect(formatValue(25.8e9, '', 'US$ ', 0)).toBe('US$ 25,8 bilhões')
    expect(formatValue(25.8e9, '', 'US$ ', 0, 'en')).toBe('$25.8 billion')
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
