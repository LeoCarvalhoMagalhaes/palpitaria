// Gera public/data/mais-ou-menos/categories.json com 5 categorias de dados abertos:
//  1. População de países — Natural Earth (domínio público), campo POP_EST
//  2. Área de países (km²) — calculada da geometria do Natural Earth
//  3. População de cidades brasileiras — IBGE, estimativas populacionais (agregado 6579)
//  4. Altitude de montanhas (m) — Wikidata (CC0)
//  5. Comprimento de rios (km) — Wikidata (CC0)
import fs from 'node:fs/promises'
import path from 'node:path'
import * as turf from '@turf/turf'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const OUT = path.join(ROOT, 'public/data/mais-ou-menos/categories.json')
const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria)'
const today = new Date().toISOString().slice(0, 10)

const CACHE = path.join(ROOT, 'scripts/.cache/wikidata')

async function sparql(query) {
  await fs.mkdir(CACHE, { recursive: true })
  const key = Buffer.from(query).toString('base64url').slice(-60)
  const file = path.join(CACHE, `${key}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } })
    if (res.ok) {
      const rows = (await res.json()).results.bindings
      await fs.writeFile(file, JSON.stringify(rows))
      return rows
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`Wikidata ${res.status}`)
    const wait = Number(res.headers.get('retry-after')) || 30 * (attempt + 1)
    console.log(`Wikidata ${res.status}, aguardando ${wait}s…`)
    await new Promise((r) => setTimeout(r, wait * 1000))
  }
  throw new Error('Wikidata indisponível')
}

async function countries() {
  const ne = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/.cache/ne/ne_50m_admin_0_countries.geojson'), 'utf8'))
  const names = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/mundareu/countries.json'), 'utf8')).countries
  const byId = new Map(names.map((c) => [c.id, c]))
  const pop = []
  const area = []
  for (const f of ne.features) {
    const p = f.properties
    const id = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3
    const c = byId.get(id) ?? byId.get(p.ADM0_A3)
    if (!c?.playable) continue
    if (p.POP_EST > 100000) pop.push({ name: c.name, value: Math.round(p.POP_EST), emoji: '👥' })
    const km2 = Math.round(turf.area(f) / 1e6)
    if (km2 > 1000) area.push({ name: c.name, value: km2, emoji: '🗺️' })
  }
  return { pop, area, popYear: ne.features[0].properties.POP_YEAR }
}

async function brazilianCities() {
  const url = 'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]'
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`IBGE ${res.status}`)
  const json = await res.json()
  const series = json[0].resultados[0].series
  const year = Object.keys(series[0].serie)[0]
  const items = series
    .map((s) => ({ name: s.localidade.nome.replace(/ - ([A-Z]{2})$/, ' ($1)'), value: Number(s.serie[year]), emoji: '🏙️' }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 250)
  return { items, year }
}

async function mountains() {
  const rows = await sparql(`SELECT ?m ?mLabel ?elev ?links WHERE {
    ?m wdt:P31 wd:Q8502; wdt:P2044 ?elev; wikibase:sitelinks ?links.
    FILTER(?links > 25)
    ?ptw schema:about ?m; schema:isPartOf <https://pt.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". }
  } ORDER BY DESC(?links) LIMIT 300`)
  return dedupe(rows.map((r) => ({ name: r.mLabel.value, value: Math.round(Number(r.elev.value)), emoji: '⛰️' })))
}

async function rivers() {
  const rows = await sparql(`SELECT ?r ?rLabel ?length ?links WHERE {
    ?r wdt:P31 wd:Q4022; wdt:P2043 ?length; wikibase:sitelinks ?links.
    FILTER(?links > 30)
    ?ptw schema:about ?r; schema:isPartOf <https://pt.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". }
  } ORDER BY DESC(?links) LIMIT 300`)
  return dedupe(
    rows
      .map((r) => ({ name: r.rLabel.value, value: Math.round(Number(r.length.value)), emoji: '🌊' }))
      .filter((r) => r.value >= 50 && r.value < 8000),
  )
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((i) => {
    // Rótulos sem tradução vêm como o identificador (Q123): descarta.
    if (/^Q\d+$/.test(i.name) || seen.has(i.name) || !(i.value > 0)) return false
    seen.add(i.name)
    return true
  })
}

async function main() {
  const { pop, area, popYear } = await countries()
  const cities = await brazilianCities()
  const mts = await mountains()
  const rvs = await rivers()
  const categories = [
    { id: 'pop-paises', name: 'População de países', question: 'Qual país tem mais habitantes?', unit: 'habitantes', items: pop,
      fonte: `Natural Earth (estimativa ${popYear})`, licenca: 'Domínio público', url: 'https://www.naturalearthdata.com/' },
    { id: 'area-paises', name: 'Área de países', question: 'Qual país é maior em área?', unit: 'km²', items: area,
      fonte: 'Calculada a partir dos polígonos do Natural Earth 1:50m', licenca: 'Domínio público', url: 'https://www.naturalearthdata.com/' },
    { id: 'pop-cidades', name: 'Cidades brasileiras', question: 'Qual cidade tem mais habitantes?', unit: 'habitantes', items: cities.items,
      fonte: `IBGE, estimativas da população ${cities.year}`, licenca: 'Dados públicos do IBGE', url: 'https://servicodados.ibge.gov.br/api/docs/agregados' },
    { id: 'montanhas', name: 'Montanhas', question: 'Qual montanha é mais alta?', unit: 'metros', items: mts,
      fonte: 'Wikidata (altitude, P2044)', licenca: 'CC0', url: 'https://www.wikidata.org/' },
    { id: 'rios', name: 'Rios', question: 'Qual rio é mais comprido?', unit: 'km', items: rvs,
      fonte: 'Wikidata (comprimento, P2043)', licenca: 'CC0', url: 'https://www.wikidata.org/' },
  ]
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, JSON.stringify({ obtido_em: today, categories }))
  for (const c of categories) console.log(`${c.name}: ${c.items.length} itens`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
