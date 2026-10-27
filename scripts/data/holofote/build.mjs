// Gera public/data/holofote/artists.json a partir de fontes abertas:
//  - ListenBrainz (ranking de popularidade, estatística sitewide all_time)
//  - MusicBrainz (tipo, gênero, país, integrantes, álbum de estreia, gêneros musicais) — dados centrais CC0
// Respeita o limite de 1 requisição/s do MusicBrainz e guarda cache em scripts/.cache para poder retomar.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const CACHE = path.join(ROOT, 'scripts/.cache/musicbrainz')
const OUT = path.join(ROOT, 'public/data/holofote/artists.json')
const UA = 'Palpitaria/0.1 ( https://github.com/LeoCarvalhoMagalhaes/palpitaria )'
const TARGET = Number(process.env.HOLOFOTE_TARGET ?? 1000)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function mb(urlPath, cacheName) {
  const file = path.join(CACHE, `${cacheName}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let tries = 0; tries < 5; tries++) {
    const wait = Math.max(0, last + 1100 - Date.now())
    if (wait) await sleep(wait)
    last = Date.now()
    const res = await fetch(`https://musicbrainz.org/ws/2/${urlPath}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 503 || res.status === 429) {
      await sleep(3000 * (tries + 1))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${urlPath}`)
    const json = await res.json()
    await fs.writeFile(file, JSON.stringify(json))
    return json
  }
  throw new Error(`MusicBrainz indisponível: ${urlPath}`)
}

async function topArtists(count) {
  const file = path.join(CACHE, `listenbrainz-top-${count}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  const out = []
  for (let offset = 0; out.length < count; offset += 100) {
    const res = await fetch(`https://api.listenbrainz.org/1/stats/sitewide/artists?range=all_time&count=100&offset=${offset}`, {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`ListenBrainz ${res.status}`)
    const json = await res.json()
    const batch = json.payload.artists
    if (!batch.length) break
    out.push(...batch)
    await sleep(500)
  }
  await fs.writeFile(file, JSON.stringify(out))
  return out
}

// Lista fechada de gêneros musicais (inclui gêneros brasileiros). Ordem = prioridade de correspondência.
const GENRE_RULES = [
  ['Sertanejo', /sertanejo/],
  ['Funk', /funk carioca|baile funk|brazilian funk|funk brasileiro|funk ostentação/],
  ['MPB', /\bmpb\b|bossa nova|samba|tropic[aá]lia|pagode|ax[eé]|forr[oó]|brazilian/],
  ['Latina', /reggaeton|latin|salsa|bachata|cumbia|regional mexican|corrido|urbano latino|merengue/],
  ['Metal', /metal|metalcore|deathcore/],
  ['Hip Hop', /hip hop|hip-hop|\brap\b|trap|drill|grime|boom bap/],
  ['R&B', /r&b|rhythm and blues|\bsoul\b|neo soul|contemporary r&b|motown|funk\b/],
  ['Reggae', /reggae|\bska\b|dancehall|dub\b/],
  ['Country', /country|bluegrass/],
  ['Jazz', /jazz|swing|bebop|blues/],
  ['Clássica', /classical|baroque|romantic|opera|orchestral|minimalism|soundtrack|film score/],
  ['Eletrônica', /electronic|house|techno|edm|trance|drum and bass|dubstep|idm|ambient|electro|downtempo|trip hop|big beat|french house|synthwave/],
  ['Alternativo', /alternative|indie|punk|grunge|shoegaze|emo|post-rock|new wave|dream pop|lo-fi|britpop|experimental/],
  ['Folk', /folk|singer-songwriter|americana|acoustic/],
  ['Rock', /rock/],
  ['Pop', /pop|dance|disco|k-pop|j-pop|boy band|girl group/],
]

function closedGenre(genres) {
  const sorted = [...(genres ?? [])].sort((a, b) => b.count - a.count)
  for (const g of sorted) {
    for (const [label, re] of GENRE_RULES) if (re.test(g.name.toLowerCase())) return label
  }
  return null
}

function debutYear(releaseGroups) {
  const years = releaseGroups
    .filter((rg) => rg['primary-type'] === 'Album' && !(rg['secondary-types'] ?? []).length && rg['first-release-date'])
    .map((rg) => Number(rg['first-release-date'].slice(0, 4)))
    .filter((y) => y >= 1900)
  return years.length ? Math.min(...years) : null
}

/** Formação ativa no fim da banda (ou a atual, se ela ainda existe). */
function lineup(artist) {
  const rels = (artist.relations ?? []).filter((r) => r.type === 'member of band' && r.direction === 'backward')
  const bandEnd = artist['life-span']?.ended ? artist['life-span'].end : null
  const active = rels.filter((r) => {
    if (r.attributes?.some((a) => /touring|supporting|additional/i.test(a))) return false
    if (!r.ended) return true
    return bandEnd && r.end && Number(r.end.slice(0, 4)) >= Number(bandEnd.slice(0, 4)) - 1
  })
  const ids = [...new Set(active.map((r) => r.artist.id))]
  return ids
}

function normGender(g) {
  if (!g) return null
  const s = g.toLowerCase()
  if (s === 'male') return 'Masculino'
  if (s === 'female') return 'Feminino'
  if (s === 'non-binary' || s === 'other') return 'Não binário'
  return null
}

async function main() {
  await fs.mkdir(CACHE, { recursive: true })
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  const overrides = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/data/holofote/overrides.json'), 'utf8')).members
  const top = await topArtists(Math.ceil(TARGET * 1.35))
  console.log(`ListenBrainz: ${top.length} artistas no ranking`)
  const artists = []
  const skipped = []
  let rank = 0
  for (const entry of top) {
    rank += 1
    if (artists.length >= TARGET) break
    const mbid = entry.artist_mbid
    if (!mbid) {
      skipped.push([entry.artist_name, 'sem MBID'])
      continue
    }
    try {
      const a = await mb(`artist/${mbid}?inc=genres+artist-rels&fmt=json`, `artist-${mbid}`)
      const rgs = await mb(`release-group?artist=${mbid}&type=album&limit=100&fmt=json`, `rg-${mbid}`)
      const debut = debutYear(rgs['release-groups'] ?? [])
      const genre = closedGenre(a.genres)
      const country = a.country ?? null
      let members = 1
      let gender = null
      if (a.type === 'Person') {
        gender = normGender(a.gender)
      } else if (a.type === 'Group' || a.type === 'Orchestra' || a.type === 'Choir') {
        const ids = lineup(a)
        members = overrides[a.name] ?? (ids.length || null)
        const genders = new Set()
        for (const id of ids.slice(0, 8)) {
          const m = await mb(`artist/${id}?fmt=json`, `member-${id}`)
          const g = normGender(m.gender)
          if (g) genders.add(g)
        }
        gender = genders.size > 1 ? 'Misto' : [...genders][0] ?? null
      } else {
        skipped.push([a.name, `tipo ${a.type}`])
        continue
      }
      const missing = Object.entries({ debut, genre, country, members, gender }).filter(([, v]) => v == null).map(([k]) => k)
      if (missing.length) {
        skipped.push([a.name, `faltando ${missing.join(', ')}`])
        continue
      }
      artists.push({
        id: mbid,
        name: a.name,
        rank,
        listens: entry.listen_count,
        debut,
        members,
        gender,
        genre,
        country,
        fonte: 'MusicBrainz + ListenBrainz',
        licenca: 'CC0',
        url: `https://musicbrainz.org/artist/${mbid}`,
      })
      if (artists.length % 25 === 0) console.log(`${artists.length} artistas prontos (posição ${rank})`)
    } catch (err) {
      skipped.push([entry.artist_name, String(err.message ?? err)])
    }
  }
  // O ranking exibido é a posição entre os artistas válidos (1 = mais ouvido).
  artists.forEach((a, i) => (a.rank = i + 1))
  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sources: [
      { name: 'ListenBrainz sitewide artist statistics (all time)', url: 'https://listenbrainz.org/statistics/', license: 'CC0 (confirmar)' },
      { name: 'MusicBrainz core data', url: 'https://musicbrainz.org/doc/About/Data_License', license: 'CC0' },
    ],
    artists,
  }
  await fs.writeFile(OUT, JSON.stringify(payload))
  await fs.writeFile(path.join(ROOT, 'scripts/data/holofote/skipped.json'), JSON.stringify(skipped, null, 1))
  console.log(`Pronto: ${artists.length} artistas, ${skipped.length} descartados.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
