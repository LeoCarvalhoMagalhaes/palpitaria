// Junta os IDs do Spotify (spotify-ids.mjs) com gênero e ano do catálogo da Apple (build.mjs, opcional)
// e grava public/data/musicas/songs.json, a base do Toca Aí e do Refrão Cruzado.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const CACHE = path.join(ROOT, 'scripts/.cache/musicas')
const OUT = path.join(ROOT, 'public/data/musicas/songs.json')

const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const cleanTitle = (t) => fold(t.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''))

/** Categoria do Toca Aí a partir do gênero principal da Apple. */
export function categoryOf(genre) {
  const g = (genre || '').toLowerCase()
  if (/hip-hop|rap/.test(g)) return 'hiphop'
  if (/rock|alternative|metal|punk|indie/.test(g)) return 'rock'
  if (/latin|reggaeton|urbano|brazil|sertanejo|mpb/.test(g)) return 'latina'
  if (/pop|dance|electronic|r&b|soul|singer/.test(g)) return 'pop'
  return null
}

/** Mesma regra do build.mjs: título e artista batendo, sem karaokê, cover ou tributo. */
function bestMatch(results, song) {
  const wantTitle = cleanTitle(song.title)
  const mainArtist = fold(song.artist.split(/,| & | x | feat\.? /i)[0])
  const scored = (results || [])
    .filter((r) => r.kind === 'song' && r.previewUrl)
    .map((r) => {
      const t = cleanTitle(r.trackName || '')
      const a = fold(r.artistName || '')
      let score = 0
      if (t === wantTitle) score += 3
      else if (t.startsWith(wantTitle) || wantTitle.startsWith(t)) score += 2
      if (a.includes(mainArtist) || mainArtist.includes(a)) score += 3
      if (/karaoke|tribute|cover|instrumental|in the style of/i.test(`${r.artistName} ${r.trackName} ${r.collectionName}`)) score -= 5
      return { r, score }
    })
    .sort((x, y) => y.score - x.score)
  return scored[0] && scored[0].score >= 5 ? scored[0].r : null
}

async function appleFor(rank, song) {
  try {
    const json = JSON.parse(await fs.readFile(path.join(CACHE, `itunes-${String(rank).padStart(4, '0')}.json`), 'utf8'))
    const hit = bestMatch(json.results, song)
    return hit
      ? { appleId: hit.trackId, genre: hit.primaryGenreName, year: Number(String(hit.releaseDate || '').slice(0, 4)) || null }
      : null
  } catch {
    return null
  }
}

async function main() {
  const ids = JSON.parse(await fs.readFile(path.join(CACHE, 'spotify-ids.json'), 'utf8'))
  const songs = []
  for (const s of ids) {
    const apple = await appleFor(s.kworbRank, s)
    songs.push({
      id: s.spotifyId,
      rank: songs.length + 1,
      artist: s.artist,
      title: s.title,
      streams: s.streams,
      appleId: apple?.appleId ?? null,
      genre: apple?.genre ?? null,
      year: apple?.year ?? null,
      cat: categoryOf(apple?.genre),
    })
  }
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(
    OUT,
    JSON.stringify({
      fonte: 'Ranking e IDs do Spotify: kworb.net (músicas mais tocadas da história no Spotify). Prévia de áudio, gênero e ano: catálogo da Apple (iTunes), quando encontrado.',
      obtido_em: new Date().toISOString().slice(0, 10),
      songs,
    }),
  )
  const cats = {}
  for (const s of songs) cats[s.cat ?? 'sem categoria'] = (cats[s.cat ?? 'sem categoria'] ?? 0) + 1
  console.log(`${songs.length} músicas`, cats)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
