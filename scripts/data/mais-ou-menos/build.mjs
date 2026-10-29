// Gera public/data/mais-ou-menos/categories.json (pt) e categories-en.json (en) com as 5 categorias do
// outro jogo (outro jogo). Cada item tem nome em português e inglês e, quando existe, uma imagem livre do
// Wikimedia Commons (via Wikidata P18/P41). Fontes:
//  1. Popularidade na internet — visualizações na Wikipédia (pt para a versão pt, en para a versão en)
//  2. Streams no Spotify — Kworb (capas vêm da Apple na hora de jogar)
//  3. Nota dos filmes — Metacritic via Wikidata
//  4. Preços — base MIT do outro jogo, só produtos que têm foto (ver na-etiqueta/images.ts)
//  5. Curiosidades — Natural Earth (população/área + bandeiras), IBGE (cidades), Wikidata (montanhas, rios)
import fs from 'node:fs/promises'
import path from 'node:path'
import * as turf from '@turf/turf'
import { ROOT, cachedFetchJson, chunk, fileFromCommonsUrl, imageRef, sparql } from '../lib/wikimedia.mjs'

const today = new Date().toISOString().slice(0, 10)
const img = (r, key = 'img') => (r[key] ? imageRef(fileFromCommonsUrl(r[key].value)) : null)

function dedupe(items) {
  const seen = new Set()
  return items.filter((i) => {
    if (/^Q\d+$/.test(i.name) || seen.has(i.name) || !(i.value > 0)) return false
    seen.add(i.name)
    return true
  })
}

async function topPages(lang) {
  const totals = new Map()
  const now = new Date()
  for (let k = 1; k <= 12; k++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1))
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const json = await cachedFetchJson(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${y}/${m}/all-days`,
      `pageviews-${lang}-${y}-${m}`,
    )
    for (const a of json.items[0].articles) {
      const t = a.article
      if (t.includes(':') || t === '-' || t.startsWith('.') || /\.(php|phtml|html?)$/i.test(t) || /^(Main_Page|Lista_de|List_of|Pesquisas_de_opinião|Mortes_em|Deaths_in|\d{4}(_in_.*)?$)/.test(t)) continue
      const entry = totals.get(t) ?? { views: 0, months: 0 }
      entry.views += a.views
      entry.months += 1
      totals.set(t, entry)
    }
  }
  const top = [...totals.entries()]
    .filter(([, v]) => v.months >= 3)
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 300)
  // Imagem e nome no outro idioma pelo Wikidata (ligação pelo título do artigo).
  const other = lang === 'pt' ? 'en' : 'pt'
  const meta = new Map()
  for (const [i, batch] of chunk(top.map(([t]) => t.replace(/_/g, ' ')), 80).entries()) {
    const values = batch.map((t) => `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@${lang}`).join(' ')
    const rows = await sparql(
      `SELECT ?title ?img ?otherLabel WHERE {
        VALUES ?title { ${values} }
        ?art schema:name ?title; schema:isPartOf <https://${lang}.wikipedia.org/>; schema:about ?item.
        OPTIONAL { ?item wdt:P18 ?img. }
        OPTIONAL { ?item rdfs:label ?otherLabel. FILTER(LANG(?otherLabel) = "${other}") }
      }`,
      `wiki-${lang}-meta-${i}`,
    )
    for (const r of rows) if (!meta.has(r.title.value)) meta.set(r.title.value, r)
  }
  return dedupe(
    top.map(([t, v]) => {
      const title = t.replace(/_/g, ' ')
      const r = meta.get(title)
      const otherName = r?.otherLabel?.value ?? title
      return {
        name: lang === 'pt' ? title : otherName,
        nameEn: lang === 'en' ? title : otherName,
        value: v.views,
        emoji: '🔎',
        image: r ? img(r) : null,
      }
    }),
  )
}

async function spotifyStreams() {
  const { songs } = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/musicas/songs.json'), 'utf8'))
  return songs.map((s) => ({ name: `${s.title} — ${s.artist}`, nameEn: `${s.title} — ${s.artist}`, value: s.streams, emoji: '🎧', appleId: s.appleId }))
}

async function movieScores() {
  const rows = await sparql(
    `SELECT ?f ?fLabel ?en ?ptTitle ?score ?img ?links WHERE {
      ?f wdt:P31 wd:Q11424; p:P444 ?st; wikibase:sitelinks ?links.
      ?st ps:P444 ?score; pq:P447 wd:Q150248.
      FILTER(?links > 40)
      OPTIONAL { ?ptw schema:about ?f; schema:isPartOf <https://pt.wikipedia.org/>; schema:name ?ptTitle. }
      OPTIONAL { ?f rdfs:label ?en. FILTER(LANG(?en) = "en") }
      OPTIONAL { ?f wdt:P18 ?img. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
    } ORDER BY DESC(?links) LIMIT 600`,
    'metacritic-films-v2',
  )
  const byFilm = new Map()
  for (const r of rows) {
    const m = /^(\d+)\s*\/\s*100$/.exec(r.score.value.trim())
    if (!m || byFilm.has(r.f.value)) continue
    const pt = r.ptTitle ? r.ptTitle.value.replace(/\s*\((filme|filme de \d{4}|\d{4})\)$/, '') : r.fLabel.value
    byFilm.set(r.f.value, { name: pt, nameEn: r.en?.value ?? pt, value: Number(m[1]), emoji: '🎬', image: img(r) })
  }
  return dedupe([...byFilm.values()]).slice(0, 300)
}

async function prices() {
  const { products } = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/na-etiqueta/products.json'), 'utf8'))
  return products
    .filter((p) => p.price >= 1 && p.image)
    .map((p) => {
      const name = p.size ? `${p.name} (${p.size})` : p.name
      return { name, nameEn: name, value: p.price, emoji: p.emoji, image: { src: p.image.src, page: p.image.page } }
    })
}

async function trivia() {
  const ne = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/.cache/ne/ne_50m_admin_0_countries.geojson'), 'utf8'))
  const names = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/mundareu/countries.json'), 'utf8')).countries
  const byId = new Map(names.map((c) => [c.id, c]))
  // Bandeiras pelo código ISO 3166-1 alfa-3 (P298) → P41.
  const flags = new Map()
  const isoList = [...new Set(ne.features.map((f) => (f.properties.ISO_A3_EH !== '-99' ? f.properties.ISO_A3_EH : f.properties.ADM0_A3)))]
  for (const [i, batch] of chunk(isoList, 120).entries()) {
    const rows = await sparql(
      `SELECT ?iso ?flag WHERE { VALUES ?iso { ${batch.map((x) => `"${x}"`).join(' ')} } ?c wdt:P298 ?iso; wdt:P41 ?flag. }`,
      `flags-${i}`,
    )
    for (const r of rows) if (!flags.has(r.iso.value)) flags.set(r.iso.value, img(r, 'flag'))
  }
  const items = []
  for (const f of ne.features) {
    const p = f.properties
    const id = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3
    const c = byId.get(id) ?? byId.get(p.ADM0_A3)
    if (!c?.playable) continue
    const base = { name: c.name, nameEn: c.nameEn, image: flags.get(id) ?? null }
    if (p.POP_EST > 100000) items.push({ ...base, value: Math.round(p.POP_EST), emoji: '👥', group: 'pop-paises' })
    const km2 = Math.round(turf.area(f) / 1e6)
    if (km2 > 1000) items.push({ ...base, value: km2, emoji: '🗺️', group: 'area-paises' })
  }
  const ibge = await cachedFetchJson(
    'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]',
    'ibge-populacao',
  )
  const series = ibge[0].resultados[0].series
  const year = Object.keys(series[0].serie)[0]
  const cities = series
    .map((s) => ({ code: s.localidade.id, name: s.localidade.nome.replace(/ - ([A-Z]{2})$/, ' ($1)'), value: Number(s.serie[year]) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 250)
  const cityImg = new Map()
  for (const [i, batch] of chunk(cities, 125).entries()) {
    const rows = await sparql(
      `SELECT ?code ?img WHERE { VALUES ?code { ${batch.map((c) => `"${c.code}"`).join(' ')} } ?m wdt:P1585 ?code; wdt:P18 ?img. }`,
      `cities-img-${i}`,
    )
    for (const r of rows) if (!cityImg.has(r.code.value)) cityImg.set(r.code.value, img(r))
  }
  for (const c of cities) items.push({ name: c.name, nameEn: c.name, value: c.value, emoji: '🏙️', group: 'pop-cidades', image: cityImg.get(c.code) ?? null })

  const geo = async (cls, prop, group, emoji, minLinks, name) => {
    const rows = await sparql(
      `SELECT ?x ?pt ?en ?v ?img ?links WHERE {
        ?x wdt:P31 wd:${cls}; wdt:${prop} ?v; wikibase:sitelinks ?links. FILTER(?links > ${minLinks})
        ?ptw schema:about ?x; schema:isPartOf <https://pt.wikipedia.org/>.
        OPTIONAL { ?x rdfs:label ?pt. FILTER(LANG(?pt) = "pt") }
        OPTIONAL { ?x rdfs:label ?en. FILTER(LANG(?en) = "en") }
        OPTIONAL { ?x wdt:P18 ?img. }
      } ORDER BY DESC(?links) LIMIT 400`,
      name,
    )
    const seen = new Set()
    const out = []
    for (const r of rows) {
      if (seen.has(r.x.value) || !r.pt) continue
      seen.add(r.x.value)
      const value = Math.round(Number(r.v.value))
      if (group === 'rios' && (value < 50 || value >= 8000)) continue
      out.push({ name: r.pt.value, nameEn: r.en?.value ?? r.pt.value, value, emoji, group, image: img(r) })
    }
    return dedupe(out).slice(0, 280)
  }
  items.push(...(await geo('Q8502', 'P2044', 'montanhas', '⛰️', 25, 'montanhas-v2')))
  items.push(...(await geo('Q4022', 'P2043', 'rios', '🌊', 30, 'rios-v2')))
  return { items, ibgeYear: year, popYear: ne.features[0].properties.POP_YEAR }
}

function build(lang, wiki, spotify, films, priceItems, t) {
  const L = (pt, en) => (lang === 'en' ? en : pt)
  return [
    {
      id: 'wikipedia',
      name: L('Popularidade na internet', 'Internet popularity'),
      icon: 'search',
      question: L('Qual foi mais visto na Wikipédia nos últimos 12 meses?', 'Which got more Wikipedia views in the last 12 months?'),
      unit: L('visualizações', 'views'),
      items: wiki,
      fonte: L('Wikipédia em português: visualizações somadas dos últimos 12 meses', 'English Wikipedia: total page views over the last 12 months'),
      licenca: 'CC0',
      url: 'https://wikimedia.org/api/rest_v1/',
    },
    {
      id: 'spotify',
      name: L('Streams no Spotify', 'Spotify streams'),
      icon: 'music',
      question: L('Qual música tem mais streams no Spotify?', 'Which song has more Spotify streams?'),
      unit: 'streams',
      items: spotify,
      fonte: L('Kworb: músicas mais tocadas da história do Spotify', 'Kworb: most-streamed songs in Spotify history'),
      licenca: L('Dados públicos do Kworb', 'Public Kworb data'),
      url: 'https://kworb.net/spotify/songs.html',
    },
    {
      id: 'filmes',
      name: L('Nota dos filmes', 'Movie ratings'),
      icon: 'film',
      question: L('Qual filme tem a nota maior no Metacritic?', 'Which movie has the higher Metacritic score?'),
      unit: L('pontos (de 100)', 'points (out of 100)'),
      items: films,
      fonte: L('Nota do Metacritic registrada no Wikidata', 'Metacritic score recorded on Wikidata'),
      licenca: 'CC0',
      url: 'https://www.wikidata.org/',
    },
    {
      id: 'precos',
      name: L('Preços', 'Prices'),
      icon: 'tag',
      question: L('Qual produto é mais caro?', 'Which product costs more?'),
      unit: '',
      prefix: 'US$ ',
      decimals: 2,
      items: priceItems,
      fonte: L('Base de preços do outro jogo (atacado dos EUA, 2022–2023); fotos do Wikimedia Commons', 'outro jogo price data (US warehouse store, 2022–2023); photos from Wikimedia Commons'),
      licenca: 'MIT',
      url: 'https://github.com/KermWasTaken',
    },
    {
      id: 'curiosidades',
      name: L('Curiosidades', 'Trivia'),
      icon: 'lightbulb',
      question: L('Qual tem mais?', 'Which one has more?'),
      unit: '',
      items: t.items,
      groups: {
        'pop-paises': { question: L('Qual país tem mais habitantes?', 'Which country has more people?'), unit: L('habitantes', 'people') },
        'area-paises': { question: L('Qual país é maior em área?', 'Which country is bigger in area?'), unit: 'km²' },
        'pop-cidades': { question: L('Qual cidade brasileira tem mais habitantes?', 'Which Brazilian city has more people?'), unit: L('habitantes', 'people') },
        montanhas: { question: L('Qual montanha é mais alta?', 'Which mountain is taller?'), unit: L('metros', 'meters') },
        rios: { question: L('Qual rio é mais comprido?', 'Which river is longer?'), unit: 'km' },
      },
      fonte: L(
        `Natural Earth (população ${t.popYear} e área), IBGE (estimativa ${t.ibgeYear}) e Wikidata (montanhas e rios); imagens do Wikimedia Commons`,
        `Natural Earth (${t.popYear} population and area), IBGE (${t.ibgeYear} estimate) and Wikidata (mountains and rivers); images from Wikimedia Commons`,
      ),
      licenca: L('Domínio público / dados públicos / CC0', 'Public domain / public data / CC0'),
      url: 'https://www.naturalearthdata.com/',
    },
  ].map((c) => ({
    ...c,
    // Toda opção mostra uma imagem: só entram itens com foto (ou capa da Apple, no caso das músicas).
    items: c.items
      .filter((i) => i.image || i.appleId)
      .map(({ nameEn, ...i }) => ({ ...i, name: lang === 'en' ? nameEn ?? i.name : i.name })),
  }))
}

async function main() {
  const [wikiPt, wikiEn, spotify, films, priceItems, t] = [
    await topPages('pt'),
    await topPages('en'),
    await spotifyStreams(),
    await movieScores(),
    await prices(),
    await trivia(),
  ]
  const out = path.join(ROOT, 'public/data/mais-ou-menos')
  await fs.mkdir(out, { recursive: true })
  for (const lang of ['pt', 'en']) {
    const categories = build(lang, lang === 'pt' ? wikiPt : wikiEn, spotify, films, priceItems, t)
    await fs.writeFile(path.join(out, lang === 'pt' ? 'categories.json' : 'categories-en.json'), JSON.stringify({ obtido_em: today, categories }))
    for (const c of categories) {
      const withImg = c.items.filter((i) => i.image || i.appleId).length
      console.log(`[${lang}] ${c.name}: ${c.items.length} itens, ${withImg} com imagem · ex.: ${c.items.slice(0, 2).map((i) => i.name).join(' | ')}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
