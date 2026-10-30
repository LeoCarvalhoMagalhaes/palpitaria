// Faixa oficial da Apple para as músicas além das 1.000 primeiras, sem a iTunes Search API (o robots.txt de
// itunes.apple.com bloqueia /search para robôs). Só usa /lookup:
//  1. ID do artista na Apple: vem das faixas já casadas (lookup pelo ID da faixa) ou, se o artista ainda não tem
//     faixa, do Wikidata (ID do Spotify P1902 → ID da Apple Music P2850);
//  2. Músicas do artista: /lookup?id=<artista>&entity=song&limit=200;
//  3. Grava itunes-<posição>.json no mesmo formato da busca, para o merge.mjs casar título e artista.
// Uso: node scripts/data/musicas/apple-artists.mjs && node scripts/data/musicas/merge.mjs && node scripts/data/musicas/title-lang.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { chunk, sparql } from '../lib/wikimedia.mjs'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const CACHE = path.join(ROOT, 'scripts/.cache/musicas')
const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const mainArtist = (a) => a.split(/,| & | x | feat\.? | with /i)[0].trim()
const norm = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Índice de artistas do Kworb: nome → ID do Spotify (mesma regra do spotify-ids.mjs, que roda ao ser importado). */
function parseArtistIndex(html) {
  const map = new Map()
  for (const m of html.matchAll(/href="[^"]*artist\/([A-Za-z0-9]{22})(?:_songs)?\.html"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const key = norm(m[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&'))
    if (key && !map.has(key)) map.set(key, m[1])
  }
  return map
}

/** GET com cache em disco e pausa (~20 consultas por minuto, como pede a Apple). */
async function lookup(url, name) {
  const file = path.join(CACHE, name)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let tries = 0; tries < 5; tries++) {
    await sleep(3200)
    const res = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null)
    if (res?.ok) {
      const json = await res.json()
      await fs.writeFile(file, JSON.stringify(json))
      return json
    }
    await sleep(30000)
  }
  throw new Error(`Apple indisponível: ${url}`)
}

async function main() {
  const ids = JSON.parse(await fs.readFile(path.join(CACHE, 'spotify-ids.json'), 'utf8'))
  const songs = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/musicas/songs.json'), 'utf8')).songs
  const missing = []
  for (const s of ids) {
    const file = path.join(CACHE, `itunes-${String(s.kworbRank).padStart(4, '0')}.json`)
    if (!(await fs.stat(file).then(() => true, () => false))) missing.push(s)
  }
  console.log(`${missing.length} músicas sem faixa da Apple em cache`)

  // 1a. Artistas que já têm faixa casada: o lookup da faixa traz o ID do artista.
  const artistIds = new Map()
  const solo = songs.filter((s) => s.appleId && s.artist === mainArtist(s.artist))
  for (const [i, batch] of chunk(solo, 150).entries()) {
    const json = await lookup(`https://itunes.apple.com/lookup?id=${batch.map((s) => s.appleId).join(',')}&country=US`, `apple-tracks-${i}.json`)
    const byTrack = new Map(json.results.map((r) => [r.trackId, r.artistId]))
    for (const s of batch) if (byTrack.get(s.appleId)) artistIds.set(fold(s.artist), byTrack.get(s.appleId))
  }
  console.log(`IDs de artista pelas faixas: ${artistIds.size}`)

  // 1b. Os demais: Wikidata, a partir do ID do Spotify do artista (página do Kworb).
  const index = parseArtistIndex(await fs.readFile(path.join(CACHE, 'kworb-artists.html'), 'utf8').catch(() => ''))
  const wanted = [...new Set(missing.map((s) => mainArtist(s.artist)))].filter((a) => !artistIds.has(fold(a)))
  const spotify = wanted.map((a) => [a, index.get(norm(a))]).filter(([, id]) => id)
  for (const [i, batch] of chunk(spotify, 150).entries()) {
    const rows = await sparql(
      `SELECT ?sp ?apple WHERE { VALUES ?sp { ${batch.map(([, id]) => `"${id}"`).join(' ')} } ?a wdt:P1902 ?sp; wdt:P2850 ?apple. }`,
      `musicas-apple-artist-${i}`,
    )
    const bySp = new Map(rows.map((r) => [r.sp.value, r.apple.value]))
    for (const [name, id] of batch) if (bySp.get(id)) artistIds.set(fold(name), Number(bySp.get(id)))
  }
  console.log(`IDs de artista no total: ${artistIds.size}`)

  // 2 e 3. Músicas de cada artista, gravadas por posição do ranking.
  let written = 0
  let noArtist = 0
  for (const s of missing) {
    const id = artistIds.get(fold(mainArtist(s.artist)))
    if (!id) {
      noArtist++
      continue
    }
    const json = await lookup(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200&country=US`, `apple-artist-${id}.json`)
    const results = (json.results || []).filter((r) => r.wrapperType === 'track')
    await fs.writeFile(path.join(CACHE, `itunes-${String(s.kworbRank).padStart(4, '0')}.json`), JSON.stringify({ fonte: 'lookup do artista', results }))
    written++
    if (written % 100 === 0) console.log(`${written} músicas com lista da Apple`)
  }
  console.log(`Pronto: ${written} músicas com lista da Apple; ${noArtist} sem ID de artista`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
