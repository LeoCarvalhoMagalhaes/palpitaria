import type { MusicCategory, Song } from '@/config/music'
import {
  MAX_TRIES,
  SNIPPETS_MS,
  availableCategories,
  dailySong,
  emojiRow,
  emptyCategory,
  isFinished,
  isSameArtist,
  shareText,
  snippetFor,
  winThreshold,
  type CategoryState,
} from './logic'

const songs: Song[] = Array.from({ length: 60 }, (_, i) => ({
  id: `id${i}`,
  rank: i + 1,
  artist: `Artista ${i}`,
  title: `Música ${i}`,
  streams: 1000 - i,
  appleId: i === 59 ? null : 1000 + i,
  genre: null,
  year: null,
  cat: i < 40 ? 'pop' : 'rock',
}))
const cats: MusicCategory[] = [
  { id: 'todas', name: 'Todas', cat: null },
  { id: 'pop', name: 'Pop', cat: 'pop' },
  { id: 'rock', name: 'Rock', cat: 'rock' },
]

describe('Toca Aí', () => {
  it('trechos crescem a cada tentativa', () => {
    expect(SNIPPETS_MS).toEqual([130, 530, 2000, 8000, 15000])
    expect(snippetFor(emptyCategory())).toBe(130)
    expect(snippetFor({ attempts: [{ kind: 'skip' }, { kind: 'skip' }] })).toBe(2000)
  })

  it('termina ao acertar ou após 5 tentativas', () => {
    expect(isFinished({ attempts: [{ kind: 'guess', id: 'a', label: 'x', correct: true }] })).toBe(true)
    expect(isFinished({ attempts: Array(MAX_TRIES).fill({ kind: 'skip' }) })).toBe(true)
    expect(isFinished({ attempts: [{ kind: 'skip' }] })).toBe(false)
  })

  it('categorias com poucas músicas ficam de fora', () => {
    expect(availableCategories(cats, songs).map((c) => c.id)).toEqual(['todas', 'pop'])
  })

  it('só músicas com prévia podem ser a resposta', () => {
    const ids = new Set(Array.from({ length: 200 }, (_, i) => dailySong(cats[2], songs, i + 1).id))
    expect(ids.has('id59')).toBe(false)
  })

  it('música do dia é da categoria e não repete por um ciclo', () => {
    expect(dailySong(cats[1], songs, 3).cat).toBe('pop')
    const cycle = new Set(Array.from({ length: 40 }, (_, i) => dailySong(cats[1], songs, i + 1).id))
    expect(cycle.size).toBe(40)
  })

  it('artista certo com música errada fica amarelo', () => {
    expect(isSameArtist({ artist: 'Drake' }, { artist: 'Drake' })).toBe(true)
    expect(isSameArtist({ artist: 'Wizkid' }, { artist: 'Drake, Wizkid' })).toBe(true)
    expect(isSameArtist({ artist: 'Beyoncé' }, { artist: 'Beyonce' })).toBe(true)
    expect(isSameArtist({ artist: 'Shakira' }, { artist: 'Shakira & Bizarrap' })).toBe(true)
    expect(isSameArtist({ artist: 'Ed Sheeran' }, { artist: 'The Weeknd' })).toBe(false)
    expect(isSameArtist({ artist: 'Drake' }, { artist: 'Drake Bell' })).toBe(false)
    const s: CategoryState = { attempts: [{ kind: 'guess', id: 'x', label: 'x', correct: false, sameArtist: true }] }
    expect(emojiRow(s)).toBe('🟨⬛⬛⬛⬛')
  })

  it('emojis e compartilhamento', () => {
    const s: CategoryState = {
      attempts: [{ kind: 'guess', id: 'a', label: 'a', correct: false }, { kind: 'skip' }, { kind: 'guess', id: 'b', label: 'b', correct: true }],
    }
    expect(emojiRow(s)).toBe('🟥⬜🟩⬛⬛')
    expect(shareText('Toca Aí', 1, cats.slice(0, 1), { todas: s })).toBe('Toca Aí #1 🎧 1/1\n🟥⬜🟩⬛⬛ Todas')
    expect(winThreshold(3)).toBe(2)
    expect(winThreshold(1)).toBe(1)
  })
})
