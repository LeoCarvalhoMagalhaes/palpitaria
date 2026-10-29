import { scaleSequential } from 'd3-scale'
import { interpolateBlues, interpolateGreys, interpolateOrRd, interpolateTurbo } from 'd3-scale-chromatic'
import { normalize, pickDaily } from '@/core/daily'

export const MAX_DISTANCE_KM = 15000
export const ALMOST_ADJACENT_KM = 100

export interface Country {
  id: string
  name: string
  nameEn: string
  playable: boolean
  parent: string | null
  continent: string
  aliases: string[]
  label: [number, number]
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

export interface DistanceTable {
  ids: string[]
  km: number[]
}

export class Distances {
  private index = new Map<string, number>()
  private table: DistanceTable
  constructor(table: DistanceTable) {
    this.table = table
    table.ids.forEach((id, i) => this.index.set(id, i))
  }
  get(a: string, b: string): number {
    if (a === b) return 0
    let i = this.index.get(a)
    let j = this.index.get(b)
    if (i === undefined || j === undefined) throw new Error(`País sem distância: ${a}/${b}`)
    if (i > j) [i, j] = [j, i]
    const n = this.table.ids.length
    return this.table.km[i * n - (i * (i + 1)) / 2 + (j - i - 1)]
  }
}

export function dailyCountry(playableIds: string[], number: number): string {
  return pickDaily([...playableIds].sort(), number, 'mundareu')
}

export function countryKeys(c: Country): string[] {
  return [c.name, c.nameEn, ...c.aliases].map(normalize)
}

/** Procura o país digitado pelo nome, nome em inglês ou apelido. */
export function findCountry(input: string, countries: Country[]): Country | null {
  const q = normalize(input)
  if (!q) return null
  return countries.find((c) => c.playable && countryKeys(c).includes(q)) ?? null
}

export type Palette = 'Padrão' | 'Vermelhos' | 'Azuis' | 'Arco-íris' | 'Tons de cinza'
export const PALETTES: Palette[] = ['Padrão', 'Vermelhos', 'Azuis', 'Arco-íris', 'Tons de cinza']

function interpolator(palette: Palette, highContrast: boolean): (t: number) => string {
  switch (palette) {
    case 'Vermelhos':
      return interpolateOrRd
    case 'Azuis':
      return interpolateBlues
    case 'Arco-íris':
      return (t) => interpolateTurbo(0.1 + t * 0.85)
    case 'Tons de cinza':
      return (t) => interpolateGreys(0.15 + t * 0.8)
    default:
      return highContrast ? interpolateBlues : interpolateOrRd
  }
}

export const ANSWER_COLOR = '#2a8c50'
export const TERRITORY_COLOR = '#BBBBBB'

/** Cor do palpite: clara quando longe (15.000 km), escura/quente quando perto (0 km). */
export function proximityColor(km: number, palette: Palette = 'Padrão', highContrast = false): string {
  const scale = scaleSequential(interpolator(palette, highContrast)).domain([MAX_DISTANCE_KM, 0]).clamp(true)
  return scale(km)
}

export function shareEmoji(km: number, isAnswer: boolean): string {
  if (isAnswer) return '🟩'
  const ratio = km / MAX_DISTANCE_KM
  if (ratio < 0.1) return '🟥'
  if (ratio < 0.25) return '🟧'
  if (ratio < 0.5) return '🟨'
  return '⬜'
}

export function shareGrid(entries: { km: number; isAnswer: boolean }[]): string {
  const emojis = entries.map((e) => shareEmoji(e.km, e.isAnswer))
  const lines: string[] = []
  for (let i = 0; i < emojis.length; i += 8) lines.push(emojis.slice(i, i + 8).join(''))
  return lines.join('\n')
}

export function proximityMessage(name: string, km: number, previousBest: number | null, lang: 'pt' | 'en' = 'pt'): string {
  const en = lang === 'en'
  if (km === 0) return en ? `${name} borders the mystery country!` : `${name} faz fronteira com o país misterioso!`
  if (km <= ALMOST_ADJACENT_KM) return en ? `${name} is right next to the mystery country!` : `${name} está quase colado no país misterioso!`
  if (previousBest === null) return en ? `${name} is your first guess. Now warm up!` : `${name} é o primeiro palpite. Agora é esquentar!`
  if (km < previousBest) return en ? `${name} is warmer! 🔥` : `${name} está mais quente! 🔥`
  return en ? `${name} is colder. 🧊` : `${name} está mais frio. 🧊`
}

/** Nomes das paletas em inglês (a chave salva continua em português). */
export const PALETTE_EN: Record<Palette, string> = {
  Padrão: 'Default',
  Vermelhos: 'Reds',
  Azuis: 'Blues',
  'Arco-íris': 'Rainbow',
  'Tons de cinza': 'Grayscale',
}

export function formatDistance(km: number, units: 'km' | 'mi', lang: 'pt' | 'en' = 'pt'): string {
  const value = units === 'mi' ? Math.round(km * 0.621371) : km
  return `${value.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')} ${units}`
}
