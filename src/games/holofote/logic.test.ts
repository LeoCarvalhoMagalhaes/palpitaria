import fs from 'node:fs'
import path from 'node:path'
import { compare, dailyArtist, flagEmoji, shareText, type Artist } from './logic'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/holofote/artists.json'), 'utf8'))
const artists: Artist[] = data.artists

const base: Artist = {
  id: 'a',
  name: 'Banda A',
  rank: 100,
  debut: 2000,
  members: 4,
  gender: 'Masculino',
  genre: 'Rock',
  country: 'GB',
  countryName: 'Reino Unido',
  continent: 'Europa',
}

describe('Holofote', () => {
  it('estreia: amarelo até 5 anos, não com 6', () => {
    expect(compare({ ...base, debut: 1995 }, base).debut.match).toBe('close')
    expect(compare({ ...base, debut: 1994 }, base).debut.match).toBe('miss')
    expect(compare({ ...base, debut: 1995 }, base).debut.arrow).toBe('up')
    expect(compare({ ...base, debut: 2005 }, base).debut.arrow).toBe('down')
  })

  it('popularidade: amarelo até 50 posições, não com 51', () => {
    expect(compare({ ...base, rank: 150 }, base).popularity.match).toBe('close')
    expect(compare({ ...base, rank: 151 }, base).popularity.match).toBe('miss')
    // palpite #150 e resposta #100: a resposta é mais popular (seta para cima)
    expect(compare({ ...base, rank: 150 }, base).popularity.arrow).toBe('up')
  })

  it('nacionalidade: mesmo continente fica amarelo', () => {
    expect(compare({ ...base, country: 'FR', continent: 'Europa' }, base).country.match).toBe('close')
    expect(compare({ ...base, country: 'US', continent: 'América do Norte' }, base).country.match).toBe('miss')
  })

  it('compartilhamento com dica na posição usada', () => {
    const rows = [compare({ ...base, debut: 1980, country: 'US', continent: 'América do Norte' }, base), compare(base, base)]
    expect(shareText('Holofote', 9, rows, true, 1)).toBe('Holofote #9 2/10\n\n📅👥📈🚻💽🌎\n⬜🟩🟩🟩🟩⬜\n💡\n🟩🟩🟩🟩🟩🟩')
  })

  it('bandeira a partir do código do país', () => {
    expect(flagEmoji('BR')).toBe('🇧🇷')
  })

  it('base: atributos completos e artista do dia determinístico', () => {
    expect(artists.length).toBeGreaterThan(900)
    for (const a of artists) {
      expect(a.debut).toBeGreaterThan(1900)
      expect(a.members).toBeGreaterThanOrEqual(1)
      expect(['Masculino', 'Feminino', 'Misto', 'Não binário']).toContain(a.gender)
      expect(a.genre && a.continent && a.countryName).toBeTruthy()
    }
    expect(dailyArtist(artists, 3).id).toBe(dailyArtist(artists, 3).id)
  })
})
