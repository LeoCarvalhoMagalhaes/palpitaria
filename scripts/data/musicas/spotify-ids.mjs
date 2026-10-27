// IDs do Spotify das 1.000 músicas mais tocadas, pela mesma técnica do projeto outro projeto:
// o ranking do Kworb não tem links, então o ID vem da página de músicas de cada artista no Kworb
// (mesmo título e streams com diferença de até 1%). robots.txt do Kworb: Allow /.
// Saída: scripts/.cache/musicas/spotify-ids.json (usado por merge.mjs).
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const CACHE = path.join(ROOT, 'scripts/.cache/musicas')
const TARGET = Number(process.env.MUSICAS_TARGET ?? 1000)
const NON_MUSIC = /white noise|brown noise|pink noise|baby sleep|sleep sounds|rain sounds|fan noise/i
const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria)'

const norm = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const decode = (t) =>
  t
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/\s+/g, ' ')
    .trim()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cachedText(url, name) {
  const file = path.join(CACHE, name)
  try {
    return await fs.readFile(file, 'utf8')
  } catch {}
  await sleep(1200)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Kworb ${res.status} ${url}`)
  const text = await res.text()
  await fs.writeFile(file, text)
  return text
}

export function parseRanking(html) {
  const rows = []
  const body = html.split(/<tbody[^>]*>/i)[1] || html
  for (const tr of body.split(/<tr[^>]*>/i).slice(1)) {
    const cells = tr
      .split(/<td[^>]*>/i)
      .slice(1)
      .map((c) => c.split(/<\/td>/i)[0])
    if (cells.length < 2) continue
    const text = decode(cells[0])
    const cut = text.indexOf(' - ')
    if (cut === -1) continue
    const streams = parseInt(decode(cells[1]).replace(/[^\d]/g, ''), 10)
    rows.push({ artist: text.slice(0, cut).trim(), title: text.slice(cut + 3).trim(), streams })
  }
  return rows
}

export function parseArtistIndex(html) {
  const map = new Map()
  for (const m of html.matchAll(/href="[^"]*artist\/([A-Za-z0-9]{22})(?:_songs)?\.html"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const key = norm(decode(m[2]))
    if (key && !map.has(key)) map.set(key, m[1])
  }
  return map
}

export function parseArtistSongs(html) {
  const out = []
  for (const tr of html.split(/<tr[^>]*>/i).slice(1)) {
    const link = tr.match(/href="https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})"[^>]*>([\s\S]*?)<\/a>/i)
    if (!link) continue
    const cells = tr
      .split(/<td[^>]*>/i)
      .slice(1)
      .map((c) => c.split(/<\/td>/i)[0])
    const streams = parseInt(decode(cells[1] || '').replace(/[^\d]/g, ''), 10)
    out.push({ spotifyId: link[1], title: decode(link[2]), streams: Number.isFinite(streams) ? streams : null })
  }
  return out
}

export function matchTrack(tracks, title, streams) {
  const near = (t) => t.streams && Math.abs(t.streams - streams) / streams <= 0.01
  const byStreams = (a, b) => Math.abs(a.streams - streams) - Math.abs(b.streams - streams)
  const same = tracks.filter((t) => norm(t.title) === norm(title) && near(t)).sort(byStreams)
  if (same.length) return same[0].spotifyId
  const prefix = tracks
    .filter(
      (t) =>
        t.streams &&
        (norm(t.title).startsWith(norm(title)) || norm(title).startsWith(norm(t.title))) &&
        Math.abs(t.streams - streams) / streams <= 0.001,
    )
    .sort(byStreams)
  return prefix.length ? prefix[0].spotifyId : null
}

async function main() {
  await fs.mkdir(CACHE, { recursive: true })
  const rows = parseRanking(await cachedText('https://kworb.net/spotify/songs.html', 'kworb-songs.html'))
  const index = parseArtistIndex(await cachedText('https://kworb.net/spotify/artists.html', 'kworb-artists.html'))
  console.log(`ranking: ${rows.length} músicas; índice: ${index.size} artistas`)
  const songs = []
  const failed = []
  const seen = new Set()
  for (let i = 0; i < rows.length && songs.length < TARGET; i++) {
    const row = rows[i]
    if (NON_MUSIC.test(`${row.artist} ${row.title}`)) continue
    const key = `${norm(row.artist)}|${norm(row.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    const artistId = index.get(norm(row.artist))
    if (!artistId) {
      failed.push(`${row.artist} - ${row.title} (artista fora do índice)`)
      continue
    }
    try {
      const tracks = parseArtistSongs(await cachedText(`https://kworb.net/spotify/artist/${artistId}_songs.html`, `artist-${artistId}.html`))
      const id = matchTrack(tracks, row.title, row.streams)
      if (!id) {
        failed.push(`${row.artist} - ${row.title} (faixa não encontrada)`)
        continue
      }
      songs.push({ kworbRank: i + 1, artist: row.artist, title: row.title, streams: row.streams, spotifyId: id })
      if (songs.length % 50 === 0) console.log(`${songs.length} IDs (posição ${i + 1})`)
    } catch (err) {
      failed.push(`${row.artist} - ${row.title} (${err.message})`)
    }
  }
  await fs.writeFile(path.join(CACHE, 'spotify-ids.json'), JSON.stringify(songs))
  await fs.writeFile(path.join(ROOT, 'scripts/data/musicas/spotify-missing.json'), JSON.stringify(failed, null, 1))
  console.log(`Pronto: ${songs.length} músicas com ID, ${failed.length} sem.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
