import { pickDaily } from '@/core/daily'

export const MAX_GUESSES = 10
export const HINT_AFTER = 6
/** O artista do dia sai dos mais conhecidos; todos os outros valem como palpite. */
export const ANSWER_POOL = 500

export interface Artist {
  id: string
  name: string
  rank: number
  debut: number
  members: number
  gender: string
  genre: string
  country: string
  countryName: string
  continent: string
  image?: { src: string; page: string }
}

export type Lang = 'pt' | 'en'

const EN: Record<string, string> = {
  Masculino: 'Male',
  Feminino: 'Female',
  Misto: 'Mixed',
  'Não binário': 'Non-binary',
  Alternativo: 'Alternative',
  Metal: 'Metal',
  Eletrônica: 'Electronic',
  Rock: 'Rock',
  'Hip Hop': 'Hip Hop',
  'R&B': 'R&B',
  Pop: 'Pop',
  Folk: 'Folk',
  Jazz: 'Jazz',
  Clássica: 'Classical',
  Country: 'Country',
  Reggae: 'Reggae',
  Latina: 'Latin',
}

/** Gênero e estilo vêm em português nos dados; em inglês, traduz pela tabela. */
export function attr(value: string, lang: Lang): string {
  return lang === 'en' ? (EN[value] ?? value) : value
}

export function countryName(a: Artist, lang: Lang): string {
  if (lang === 'pt') return a.countryName
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(a.country) ?? a.countryName
  } catch {
    return a.countryName
  }
}

export type Match = 'correct' | 'close' | 'miss'
export type Arrow = 'up' | 'down' | null

export interface Comparison {
  debut: { match: Match; arrow: Arrow }
  members: { match: Match }
  popularity: { match: Match; arrow: Arrow }
  gender: { match: Match }
  genre: { match: Match }
  country: { match: Match }
}

/** Regras observadas no original: estreia a até 5 anos e popularidade a até 50 posições ficam amarelas. */
export function compare(guess: Artist, answer: Artist): Comparison {
  const debutDiff = answer.debut - guess.debut
  const rankDiff = answer.rank - guess.rank
  return {
    debut: {
      match: debutDiff === 0 ? 'correct' : Math.abs(debutDiff) < 6 ? 'close' : 'miss',
      // ↑ a resposta estreou depois; ↓ estreou antes
      arrow: debutDiff === 0 ? null : debutDiff > 0 ? 'up' : 'down',
    },
    members: { match: guess.members === answer.members ? 'correct' : 'miss' },
    popularity: {
      match: rankDiff === 0 ? 'correct' : Math.abs(rankDiff) < 51 ? 'close' : 'miss',
      // ↑ a resposta é mais popular (posição menor, mais perto do #1)
      arrow: rankDiff === 0 ? null : rankDiff < 0 ? 'up' : 'down',
    },
    gender: { match: guess.gender === answer.gender ? 'correct' : 'miss' },
    genre: { match: guess.genre === answer.genre ? 'correct' : 'miss' },
    country: {
      match: guess.country === answer.country ? 'correct' : guess.continent === answer.continent ? 'close' : 'miss',
    },
  }
}

export function dailyArtist(artists: Artist[], number: number): Artist {
  const pool = [...artists].sort((a, b) => a.rank - b.rank).slice(0, ANSWER_POOL)
  return pickDaily(pool, number, 'holofote')
}

/** Dica liberada após o 6º palpite: primeira letra e número de palavras do nome. */
export function hintFor(answer: Artist, lang: Lang = 'pt'): string {
  const words = answer.name.trim().split(/\s+/).length
  const first = answer.name[0].toUpperCase()
  if (lang === 'en') return `The name starts with "${first}" and has ${words} ${words === 1 ? 'word' : 'words'}.`
  return `O nome começa com "${first}" e tem ${words} ${words === 1 ? 'palavra' : 'palavras'}.`
}

const EMOJI: Record<Match, string> = { correct: '🟩', close: '🟨', miss: '⬜' }

export function shareRow(c: Comparison): string {
  return [c.debut, c.members, c.popularity, c.gender, c.genre, c.country].map((x) => EMOJI[x.match]).join('')
}

export function shareText(name: string, number: number, rows: Comparison[], won: boolean, hintAfter: number | null): string {
  const lines = rows.map(shareRow)
  if (hintAfter !== null) lines.splice(Math.min(hintAfter, lines.length), 0, '💡')
  return `${name} #${number} ${won ? rows.length : 'X'}/${MAX_GUESSES}\n\n📅👥📈🚻💽🌎\n${lines.join('\n')}`
}

export function flagEmoji(iso2: string): string {
  if (!/^[A-Z]{2}$/.test(iso2)) return '🌐'
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
