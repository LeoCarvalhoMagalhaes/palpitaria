// Base de músicas dos jogos de áudio (Toca Aí e Refrão Cruzado):
//  1. Ranking: as 1.000 músicas mais tocadas da história do Spotify, lidas uma vez da página pública
//     https://kworb.net/spotify/songs.html (robots.txt: Allow /). Só artista, título e streams (fatos).
//  2. Faixa oficial: cada música é casada no catálogo da Apple pela iTunes Search API (pública, sem chave),
//     respeitando ~20 consultas/min. Guardamos só o ID da faixa e metadados; a URL da prévia é buscada
//     na hora de tocar, porque pode expirar.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const CACHE = path.join(ROOT, 'scripts/.cache/musicas')
const OUT = path.join(ROOT, 'public/data/musicas/songs.json')
const TARGET = Number(process.env.MUSICAS_TARGET ?? 1000)
const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function ranking() {
  const file = path.join(CACHE, 'kworb-songs.html')
  let html
  try {
    html = await fs.readFile(file, 'utf8')
  } catch {
    const res = await fetch('https://kworb.net/spotify/songs.html', { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`kworb ${res.status}`)
    html = await res.text()
    await fs.writeFile(file, html)
  }
  const rows = [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((m) => m[1])
  const out = []
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()))
    if (cells.length < 2) continue
    const label = cells[0]
    const sep = label.indexOf(' - ')
    if (sep < 0) continue
    const streams = Number((cells[1] ?? '').replace(/,/g, ''))
    out.push({ artist: label.slice(0, sep).trim(), title: label.slice(sep + 3).trim(), streams })
  }
  return out
}

/** Título "limpo": sem (feat. ...), [Remix], - From "Filme" etc., para comparar. */
function cleanTitle(t) {
  return fold(t.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''))
}

let last = 0
async function itunes(query, cacheName) {
  const file = path.join(CACHE, `itunes-${cacheName}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = Math.max(0, last + 3200 - Date.now())
    if (wait) await sleep(wait)
    last = Date.now()
    const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: query, entity: 'song', limit: '10', country: 'US' })}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 403 || res.status === 429) {
      console.log(`Apple pediu pausa (${res.status}), aguardando 60s…`)
      await sleep(60000)
      continue
    }
    if (!res.ok) throw new Error(`iTunes ${res.status}`)
    const json = await res.json()
    await fs.writeFile(file, JSON.stringify(json))
    return json
  }
  throw new Error('iTunes indisponível')
}

function bestMatch(results, song) {
  const wantTitle = cleanTitle(song.title)
  const mainArtist = fold(song.artist.split(/,| & | x | feat\.? /i)[0])
  const scored = results
    .filter((r) => r.kind === 'song' && r.previewUrl)
    .map((r) => {
      const t = cleanTitle(r.trackName)
      const a = fold(r.artistName)
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

async function main() {
  await fs.mkdir(CACHE, { recursive: true })
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  const list = await ranking()
  console.log(`kworb: ${list.length} músicas no ranking`)
  const songs = []
  const missing = []
  for (let i = 0; i < list.length && songs.length < TARGET; i++) {
    const s = list[i]
    const key = String(i + 1).padStart(4, '0')
    try {
      const json = await itunes(`${s.artist.split(',')[0]} ${s.title.replace(/\s*[([].*?[)\]]/g, '')}`, key)
      const m = bestMatch(json.results ?? [], s)
      if (!m) {
        missing.push(`${s.artist} - ${s.title}`)
        continue
      }
      songs.push({
        id: m.trackId,
        rank: songs.length + 1,
        spotifyRank: i + 1,
        artist: s.artist,
        title: s.title,
        streams: s.streams,
        appleArtist: m.artistName,
        appleTitle: m.trackName,
        genre: m.primaryGenreName,
        year: Number(String(m.releaseDate ?? '').slice(0, 4)) || null,
        durationMs: m.trackTimeMillis ?? null,
      })
      if (songs.length % 50 === 0) console.log(`${songs.length} músicas casadas (posição ${i + 1})`)
    } catch (err) {
      missing.push(`${s.artist} - ${s.title} (${err.message})`)
    }
  }
  await fs.writeFile(
    OUT,
    JSON.stringify({
      fonte: 'Ranking: kworb.net/spotify/songs.html (músicas mais tocadas da história no Spotify). Faixas: catálogo da Apple (iTunes Search API).',
      obtido_em: new Date().toISOString().slice(0, 10),
      songs,
    }),
  )
  await fs.writeFile(path.join(ROOT, 'scripts/data/musicas/missing.json'), JSON.stringify(missing, null, 1))
  console.log(`Pronto: ${songs.length} músicas, ${missing.length} sem correspondência.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
