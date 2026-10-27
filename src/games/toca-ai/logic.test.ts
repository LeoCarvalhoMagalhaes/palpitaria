import { AUDIO_CATEGORIES } from '@/config/soundcloud-sources'
import { MAX_TRIES, SNIPPETS_MS, dailyTrackIndex, emojiRow, isFinished, playlistOrder, shareText, snippetFor, type CategoryState } from './logic'

const empty: CategoryState = { attempts: [], answer: null, done: false }

describe('Toca Aí', () => {
  it('trechos crescem a cada tentativa', () => {
    expect(SNIPPETS_MS).toEqual([130, 530, 2000, 8000, 15000])
    expect(snippetFor(empty)).toBe(130)
    expect(snippetFor({ ...empty, attempts: [{ kind: 'skip' }, { kind: 'skip' }] })).toBe(2000)
  })

  it('termina ao acertar ou após 5 tentativas', () => {
    expect(isFinished({ ...empty, attempts: [{ kind: 'guess', id: 1, label: 'x', correct: true }] })).toBe(true)
    expect(isFinished({ ...empty, attempts: Array(MAX_TRIES).fill({ kind: 'skip' }) })).toBe(true)
    expect(isFinished({ ...empty, attempts: [{ kind: 'skip' }] })).toBe(false)
  })

  it('emojis: acerto, erro, pulo e não usada', () => {
    const s: CategoryState = {
      ...empty,
      attempts: [{ kind: 'guess', id: 1, label: 'a', correct: false }, { kind: 'skip' }, { kind: 'guess', id: 2, label: 'b', correct: true }],
    }
    expect(emojiRow(s)).toBe('🟥⬜🟩⬛⬛')
    expect(shareText('Toca Aí', 1, AUDIO_CATEGORIES.slice(0, 1), { [AUDIO_CATEGORIES[0].id]: s })).toBe(
      `Toca Aí #1 🎧 1/1\n🟥⬜🟩⬛⬛ ${AUDIO_CATEGORIES[0].name}`,
    )
  })

  it('playlist e faixa do dia são determinísticas', () => {
    const cat = AUDIO_CATEGORIES[0]
    expect(playlistOrder(cat, 5)).toEqual(playlistOrder(cat, 5))
    expect(new Set(playlistOrder(cat, 5)).size).toBe(cat.playlists.length)
    expect(dailyTrackIndex(30, 4, 'x')).toBe(dailyTrackIndex(30, 4, 'x'))
    expect(dailyTrackIndex(30, 4, 'x')).toBeLessThan(30)
  })
})
