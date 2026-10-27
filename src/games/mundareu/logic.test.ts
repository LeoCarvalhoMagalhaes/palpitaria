import fs from 'node:fs'
import path from 'node:path'
import {
  Distances,
  dailyCountry,
  findCountry,
  proximityMessage,
  shareEmoji,
  shareGrid,
  type Country,
  type DistanceTable,
} from './logic'

const dir = path.resolve(__dirname, '../../../public/data/mundareu')
const countries: Country[] = JSON.parse(fs.readFileSync(path.join(dir, 'countries.json'), 'utf8')).countries
const table: DistanceTable = JSON.parse(fs.readFileSync(path.join(dir, 'distances.json'), 'utf8'))
const dist = new Distances(table)

describe('Mundaréu', () => {
  it('emojis do compartilhamento nos limites da escala de 15.000 km', () => {
    expect(shareEmoji(1499, false)).toBe('🟥')
    expect(shareEmoji(1500, false)).toBe('🟧')
    expect(shareEmoji(3749, false)).toBe('🟧')
    expect(shareEmoji(3750, false)).toBe('🟨')
    expect(shareEmoji(7499, false)).toBe('🟨')
    expect(shareEmoji(7500, false)).toBe('⬜')
    expect(shareEmoji(0, true)).toBe('🟩')
  })

  it('quebra a grade em linhas de 8', () => {
    const grid = shareGrid(Array.from({ length: 10 }, () => ({ km: 9000, isAnswer: false })))
    expect(grid.split('\n').map((l) => [...l].length)).toEqual([8, 2])
  })

  it('vizinhos têm distância 0 e a tabela é simétrica', () => {
    expect(dist.get('BRA', 'ARG')).toBe(0)
    expect(dist.get('ESP', 'FRA')).toBe(0)
    expect(dist.get('JPN', 'KOR')).toBe(dist.get('KOR', 'JPN'))
    expect(dist.get('JPN', 'KOR')).toBeGreaterThan(0)
  })

  it('aceita nome, nome em inglês e apelidos', () => {
    expect(findCountry('Holanda', countries)?.id).toBe('NLD')
    expect(findCountry('eua', countries)?.id).toBe('USA')
    expect(findCountry('Germany', countries)?.id).toBe('DEU')
    expect(findCountry('Birmânia', countries)?.id).toBe('MMR')
    expect(findCountry('Groenlândia', countries)).toBeNull()
  })

  it('todo país jogável tem nome e distância para os outros', () => {
    const playable = countries.filter((c) => c.playable)
    expect(playable.length).toBeGreaterThan(190)
    for (const c of playable) {
      expect(c.name).toBeTruthy()
      expect(() => dist.get(c.id, 'BRA')).not.toThrow()
    }
  })

  it('o país do dia é determinístico e cobre um ano sem repetir', () => {
    const ids = countries.filter((c) => c.playable).map((c) => c.id)
    expect(dailyCountry(ids, 5)).toBe(dailyCountry(ids, 5))
    const year = new Set(Array.from({ length: ids.length }, (_, i) => dailyCountry(ids, i + 1)))
    expect(year.size).toBe(ids.length)
  })

  it('mensagens de proximidade', () => {
    expect(proximityMessage('Chile', 0, null)).toContain('faz fronteira')
    expect(proximityMessage('Chile', 80, 500)).toContain('quase colado')
    expect(proximityMessage('Chile', 400, 500)).toContain('mais quente')
    expect(proximityMessage('Chile', 600, 500)).toContain('mais frio')
  })
})
