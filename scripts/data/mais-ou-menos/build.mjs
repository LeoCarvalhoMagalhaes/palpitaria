// Gera public/data/mais-ou-menos/categories.json com as 5 categorias do outro jogo (outro jogo),
// adaptadas a fontes abertas:
//  1. Popularidade na internet — visualizações na Wikipédia em português nos últimos 12 meses (Wikimedia, CC0)
//     (o original usa buscas no Google, que não têm dados abertos)
//  2. Streams no Spotify — ranking do Kworb (mesma base do Toca Aí)
//  3. Nota dos filmes — Metacritic, via Wikidata (CC0)
//  4. Preços — base MIT do outro jogo (mesma do Na Etiqueta), em US$
//  5. Curiosidades — população e área de países (Natural Earth), cidades brasileiras (IBGE),
//     altitude de montanhas e comprimento de rios (Wikidata)
import fs from 'node:fs/promises'
import path from 'node:path'
import * as turf from '@turf/turf'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const OUT = path.join(ROOT, 'public/data/mais-ou-menos/categories.json')
const CACHE = path.join(ROOT, 'scripts/.cache/wikidata')
const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria)'
const today = new Date().toISOString().slice(0, 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cachedJson(url, name, headers = {}) {
  await fs.mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, `${name}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } })
    if (res.ok) {
      const json = await res.json()
      await fs.writeFile(file, JSON.stringify(json))
      return json
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`)
    const wait = Number(res.headers.get('retry-after')) || 30 * (attempt + 1)
    console.log(`${res.status}, aguardando ${wait}s…`)
    await sleep(wait * 1000)
  }
  throw new Error(`indisponível: ${url}`)
}

const sparql = (query, name) =>
  cachedJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, name, { Accept: 'application/sparql-results+json' }).then(
    (j) => j.results.bindings,
  )

function dedupe(items) {
  const seen = new Set()
  return items.filter((i) => {
    if (/^Q\d+$/.test(i.name) || seen.has(i.name) || !(i.value > 0)) return false
    seen.add(i.name)
    return true
  })
}

async function wikipediaViews() {
  const totals = new Map()
  const now = new Date()
  for (let k = 1; k <= 12; k++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1))
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const json = await cachedJson(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/pt.wikipedia/all-access/${y}/${m}/all-days`,
      `pageviews-${y}-${m}`,
    )
    for (const a of json.items[0].articles) {
      const t = a.article
      if (t.includes(':') || /\.(php|phtml|html?)$/i.test(t) || /^(Lista_de|Pesquisas_de_opinião|Mortes_em|\d{4}$)/.test(t)) continue
      const entry = totals.get(t) ?? { views: 0, months: 0 }
      entry.views += a.views
      entry.months += 1
      totals.set(t, entry)
    }
  }
  // Só artigos que aparecem no top em vários meses (evita picos de um dia só).
  return dedupe(
    [...totals.entries()]
      .filter(([, v]) => v.months >= 3)
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 300)
      .map(([t, v]) => ({ name: t.replace(/_/g, ' '), value: v.views, emoji: '🔎' })),
  )
}

async function spotifyStreams() {
  const { songs } = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/musicas/songs.json'), 'utf8'))
  return songs.map((s) => ({ name: `${s.title} — ${s.artist}`, value: s.streams, emoji: '🎧' }))
}

async function movieScores() {
  const rows = await sparql(
    `SELECT ?f ?fLabel ?ptTitle ?score ?links WHERE {
      ?f wdt:P31 wd:Q11424; p:P444 ?st; wikibase:sitelinks ?links.
      ?st ps:P444 ?score; pq:P447 wd:Q150248.
      FILTER(?links > 40)
      OPTIONAL { ?ptw schema:about ?f; schema:isPartOf <https://pt.wikipedia.org/>; schema:name ?ptTitle. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
    } ORDER BY DESC(?links) LIMIT 500`,
    'metacritic-films-pt',
  )
  return dedupe(
    rows
      .map((r) => {
        const m = /^(\d+)\s*\/\s*100$/.exec(r.score.value.trim())
        const title = r.ptTitle ? r.ptTitle.value.replace(/\s*\((filme|filme de \d{4}|\d{4})\)$/, '') : r.fLabel.value
        return m ? { name: title, value: Number(m[1]), emoji: '🎬' } : null
      })
      .filter(Boolean),
  ).slice(0, 300)
}

async function prices() {
  const { products } = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/na-etiqueta/products.json'), 'utf8'))
  return products
    .filter((p) => p.price >= 1)
    .map((p) => ({ name: p.size ? `${p.name} (${p.size})` : p.name, value: p.price, emoji: p.emoji }))
}

async function trivia() {
  const ne = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/.cache/ne/ne_50m_admin_0_countries.geojson'), 'utf8'))
  const names = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/mundareu/countries.json'), 'utf8')).countries
  const byId = new Map(names.map((c) => [c.id, c]))
  const items = []
  for (const f of ne.features) {
    const p = f.properties
    const id = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3
    const c = byId.get(id) ?? byId.get(p.ADM0_A3)
    if (!c?.playable) continue
    if (p.POP_EST > 100000) items.push({ name: c.name, value: Math.round(p.POP_EST), emoji: '👥', group: 'pop-paises' })
    const km2 = Math.round(turf.area(f) / 1e6)
    if (km2 > 1000) items.push({ name: c.name, value: km2, emoji: '🗺️', group: 'area-paises' })
  }
  const ibge = await cachedJson(
    'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]',
    'ibge-populacao',
  )
  const series = ibge[0].resultados[0].series
  const year = Object.keys(series[0].serie)[0]
  series
    .map((s) => ({ name: s.localidade.nome.replace(/ - ([A-Z]{2})$/, ' ($1)'), value: Number(s.serie[year]), emoji: '🏙️', group: 'pop-cidades' }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 250)
    .forEach((i) => items.push(i))
  const mts = await sparql(
    `SELECT ?m ?mLabel ?elev ?links WHERE {
      ?m wdt:P31 wd:Q8502; wdt:P2044 ?elev; wikibase:sitelinks ?links. FILTER(?links > 25)
      ?ptw schema:about ?m; schema:isPartOf <https://pt.wikipedia.org/>.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". }
    } ORDER BY DESC(?links) LIMIT 300`,
    'montanhas',
  )
  dedupe(mts.map((r) => ({ name: r.mLabel.value, value: Math.round(Number(r.elev.value)), emoji: '⛰️', group: 'montanhas' }))).forEach((i) =>
    items.push(i),
  )
  const rvs = await sparql(
    `SELECT ?r ?rLabel ?length ?links WHERE {
      ?r wdt:P31 wd:Q4022; wdt:P2043 ?length; wikibase:sitelinks ?links. FILTER(?links > 30)
      ?ptw schema:about ?r; schema:isPartOf <https://pt.wikipedia.org/>.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". }
    } ORDER BY DESC(?links) LIMIT 300`,
    'rios',
  )
  dedupe(
    rvs.map((r) => ({ name: r.rLabel.value, value: Math.round(Number(r.length.value)), emoji: '🌊', group: 'rios' })).filter((r) => r.value >= 50 && r.value < 8000),
  ).forEach((i) => items.push(i))
  return { items, ibgeYear: year, popYear: ne.features[0].properties.POP_YEAR }
}

async function main() {
  const t = await trivia()
  const categories = [
    {
      id: 'wikipedia',
      name: 'Popularidade na internet',
      question: 'Qual foi mais visto na Wikipédia nos últimos 12 meses?',
      unit: 'visualizações',
      items: await wikipediaViews(),
      fonte: 'Wikipédia em português: visualizações somadas dos últimos 12 meses (Wikimedia Pageviews API)',
      licenca: 'CC0',
      url: 'https://wikimedia.org/api/rest_v1/',
    },
    {
      id: 'spotify',
      name: 'Streams no Spotify',
      question: 'Qual música tem mais streams no Spotify?',
      unit: 'streams',
      items: await spotifyStreams(),
      fonte: 'Kworb: músicas mais tocadas da história do Spotify',
      licenca: 'Dados públicos do Kworb',
      url: 'https://kworb.net/spotify/songs.html',
    },
    {
      id: 'filmes',
      name: 'Nota dos filmes',
      question: 'Qual filme tem a nota maior no Metacritic?',
      unit: 'pontos (de 100)',
      items: await movieScores(),
      fonte: 'Nota do Metacritic registrada no Wikidata (P444)',
      licenca: 'CC0',
      url: 'https://www.wikidata.org/',
    },
    {
      id: 'precos',
      name: 'Preços',
      question: 'Qual produto é mais caro?',
      unit: '',
      prefix: 'US$ ',
      decimals: 2,
      items: await prices(),
      fonte: 'Base de preços do outro jogo (atacado dos EUA, 2022–2023)',
      licenca: 'MIT',
      url: 'https://github.com/KermWasTaken',
    },
    {
      id: 'curiosidades',
      name: 'Curiosidades',
      question: 'Qual tem mais?',
      unit: '',
      items: t.items,
      groups: {
        'pop-paises': { question: 'Qual país tem mais habitantes?', unit: 'habitantes' },
        'area-paises': { question: 'Qual país é maior em área?', unit: 'km²' },
        'pop-cidades': { question: 'Qual cidade tem mais habitantes?', unit: 'habitantes' },
        montanhas: { question: 'Qual montanha é mais alta?', unit: 'metros' },
        rios: { question: 'Qual rio é mais comprido?', unit: 'km' },
      },
      fonte: `Natural Earth (população ${t.popYear} e área), IBGE (estimativa ${t.ibgeYear}) e Wikidata (montanhas e rios)`,
      licenca: 'Domínio público / dados públicos / CC0',
      url: 'https://www.naturalearthdata.com/',
    },
  ]
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, JSON.stringify({ obtido_em: today, categories }))
  for (const c of categories) console.log(`${c.name}: ${c.items.length} itens · ex.: ${c.items.slice(0, 3).map((i) => `${i.name}=${i.value}`).join(' | ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
