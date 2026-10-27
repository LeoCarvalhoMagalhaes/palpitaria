// Acrescenta continente e nome do país (pt-BR) a public/data/holofote/artists.json usando o Natural Earth.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const FILE = path.join(ROOT, 'public/data/holofote/artists.json')

const CONTINENT_PT = {
  Africa: 'África',
  Asia: 'Ásia',
  Europe: 'Europa',
  'North America': 'América do Norte',
  'South America': 'América do Sul',
  Oceania: 'Oceania',
  'Seven seas (open ocean)': 'Oceania',
  Antarctica: 'Antártida',
}

const ne = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/.cache/ne/ne_50m_admin_0_countries.geojson'), 'utf8'))
const names = new Map(
  JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/mundareu/countries.json'), 'utf8')).countries.map((c) => [c.id, c.name]),
)
const byIso2 = new Map()
for (const f of ne.features) {
  const p = f.properties
  const iso2 = p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2
  if (!iso2 || iso2 === '-99' || byIso2.has(iso2)) continue
  const iso3 = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3
  byIso2.set(iso2, { continent: CONTINENT_PT[p.CONTINENT] ?? p.CONTINENT, countryName: names.get(iso3) ?? p.NAME_PT })
}
// Códigos do MusicBrainz que não são países do Natural Earth.
byIso2.set('XE', { continent: 'Europa', countryName: 'Europa' })
byIso2.set('XW', { continent: 'Mundo', countryName: 'Mundo' })
byIso2.set('XK', { continent: 'Europa', countryName: 'Kosovo' })

const data = JSON.parse(await fs.readFile(FILE, 'utf8'))
const before = data.artists.length
data.artists = data.artists
  .map((a) => ({ ...a, ...(byIso2.get(a.country) ?? {}) }))
  .filter((a) => a.continent && a.country !== 'XW')
data.artists.forEach((a, i) => (a.rank = i + 1))
await fs.writeFile(FILE, JSON.stringify(data))
console.log(`${data.artists.length} artistas (de ${before}) com continente`)
