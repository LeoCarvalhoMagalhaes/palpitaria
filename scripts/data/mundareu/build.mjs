// Gera os dados do Mundaréu a partir do Natural Earth Admin 0 1:50m (domínio público):
//  - public/data/mundareu/countries.json: geometria simplificada, nomes pt-BR, apelidos, territórios
//  - public/data/mundareu/distances.json: menor distância entre fronteiras terrestres (km) de cada par jogável
import fs from 'node:fs/promises'
import path from 'node:path'
import * as turf from '@turf/turf'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const SRC = path.join(ROOT, 'scripts/.cache/ne/ne_50m_admin_0_countries.geojson')
const OUT_DIR = path.join(ROOT, 'public/data/mundareu')

// Correções para o português do Brasil (o Natural Earth usa a grafia de Portugal).
const PT_BR = {
  YEM: 'Iêmen', VNM: 'Vietnã', SVN: 'Eslovênia', ROU: 'Romênia', POL: 'Polônia', MCO: 'Mônaco',
  MUS: 'Maurício', MDG: 'Madagascar', MKD: 'Macedônia do Norte', LVA: 'Letônia', KEN: 'Quênia',
  IRL: 'Irlanda', IRN: 'Irã', EST: 'Estônia', CZE: 'Tchéquia', ARM: 'Armênia', BEN: 'Benin',
  DJI: 'Djibuti', MWI: 'Malawi', CYM: 'Ilhas Cayman', NCL: 'Nova Caledônia', FRO: 'Ilhas Faroé',
  SWZ: 'Essuatíni', BHR: 'Bahrein', ATA: 'Antártida', KOS: 'Kosovo', MAF: 'São Martinho (França)',
  SXM: 'São Martinho (Países Baixos)', ALD: 'Åland', SOL: 'Somalilândia', CYN: 'Chipre do Norte',
  ESH: 'Saara Ocidental', BLM: 'São Bartolomeu', SIA: 'Geleira de Siachen',
}

// Apelidos e grafias alternativas aceitas (sem acento; comparados normalizados).
const ALIASES = {
  USA: ['EUA', 'Estados Unidos da America', 'America', 'USA', 'United States'],
  GBR: ['UK', 'Inglaterra', 'Gra-Bretanha', 'Gra Bretanha', 'Escocia', 'Pais de Gales'],
  NLD: ['Holanda'],
  KOR: ['Coreia', 'Coreia do Sul'],
  PRK: ['Coreia do Norte'],
  RUS: ['Russia', 'Federacao Russa'],
  MMR: ['Birmania', 'Burma', 'Mianmar'],
  ARE: ['EAU', 'Emirados', 'Emirados Arabes'],
  COD: ['RDC', 'Congo-Kinshasa', 'Congo Kinshasa', 'RD Congo'],
  COG: ['Congo', 'Congo-Brazzaville', 'Congo Brazzaville'],
  CIV: ["Cote d'Ivoire", 'Costa do Marfim'],
  SWZ: ['Suazilandia', 'Eswatini', 'Essuatini'],
  CZE: ['Republica Tcheca', 'Tchequia', 'Chequia'],
  TLS: ['Timor Leste', 'Timor'],
  BIH: ['Bosnia'],
  VAT: ['Santa Se', 'Cidade do Vaticano'],
  MKD: ['Macedonia'],
  PSE: ['Palestina', 'Estado da Palestina'],
  IRL: ['Republica da Irlanda', 'Eire'],
  KAZ: ['Cazaquistao'],
  KGZ: ['Quirguistao', 'Quirquistao'],
  BLR: ['Belarus', 'Bielorrussia'],
  MDA: ['Moldova', 'Moldavia'],
  CPV: ['Cabo Verde'],
  TWN: ['Taiwan', 'Formosa'],
  VNM: ['Vietname', 'Vietna'],
  IRN: ['Irao', 'Persia'],
  BHR: ['Barein', 'Bahrain'],
  DJI: ['Djibouti', 'Jibuti'],
  MWI: ['Malaui'],
  STP: ['Sao Tome'],
  KNA: ['Sao Cristovao'],
  VCT: ['Sao Vicente'],
  GNB: ['Guine Bissau'],
  GNQ: ['Guine Equatorial'],
  PNG: ['Papua Nova Guine'],
  CAF: ['RCA', 'Republica Centro Africana'],
  DOM: ['Republica Dominicana'],
  ZAF: ['Africa do Sul'],
  SAU: ['Arabia Saudita', 'Arabia'],
  NZL: ['Nova Zelandia'],
  TTO: ['Trinidad'],
  ATG: ['Antigua'],
  FSM: ['Micronesia', 'Estados Federados da Micronesia'],
  SSD: ['Sudao do Sul'],
  LKA: ['Sri Lanka', 'Ceilao'],
  MUS: ['Mauricia', 'Mauricio', 'Ilhas Mauricio'],
  TUR: ['Turquia', 'Turkiye'],
  EGY: ['Egito'],
}

const PLAYABLE_TYPES = new Set(['Sovereign country', 'Country', 'Sovereignty'])
const EXTRA_PLAYABLE = new Set(['ISR', 'KOS', 'PSE'])
const NOT_PLAYABLE = new Set(['SOL', 'CYN', 'ATA', 'SIA', 'ESH'])

const round = (n) => Math.round(n * 100) / 100
function roundGeometry(geom) {
  const r = (c) => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(r))
  return { type: geom.type, coordinates: r(geom.coordinates) }
}

function rings(geom) {
  return geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat()
}

function toUnit([lon, lat]) {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

async function main() {
  const src = JSON.parse(await fs.readFile(SRC, 'utf8'))
  const features = []
  for (const f of src.features) {
    const p = f.properties
    const adm = p.ADM0_A3
    const id = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : adm
    const playable =
      !NOT_PLAYABLE.has(adm) &&
      (EXTRA_PLAYABLE.has(adm) || EXTRA_PLAYABLE.has(id) || (PLAYABLE_TYPES.has(p.TYPE) && p.SOVEREIGNT === p.ADMIN))
    features.push({ f, id: adm === 'KOS' ? 'KOS' : id, adm, playable })
  }
  // Território: aponta para o país soberano (cinza quando ele for chutado).
  const bySovereign = new Map(features.filter((x) => x.playable).map((x) => [x.f.properties.ADMIN, x.id]))
  bySovereign.set('Israel', 'ISR')

  const out = []
  const seenIds = new Set()
  for (const x of features) {
    const p = x.f.properties
    let id = x.id
    if (seenIds.has(id)) id = x.adm
    seenIds.add(id)
    x.id = id
    const simplified = turf.simplify(x.f, { tolerance: 0.04, highQuality: false })
    out.push({
      id,
      name: PT_BR[id] ?? PT_BR[x.adm] ?? p.NAME_PT ?? p.NAME,
      nameEn: p.NAME_EN,
      playable: x.playable,
      parent: x.playable ? null : bySovereign.get(p.SOVEREIGNT) ?? null,
      continent: p.CONTINENT,
      aliases: ALIASES[id] ?? [],
      label: [round(p.LABEL_X), round(p.LABEL_Y)],
      geometry: roundGeometry(simplified.geometry),
    })
  }

  // --- Distâncias entre fronteiras ---
  const playable = features.filter((x) => x.playable)
  // Fronteira compartilhada: vértices idênticos na geometria original.
  const vertexOwners = new Map()
  for (const x of playable) {
    for (const ring of rings(x.f.geometry)) {
      for (const [lon, lat] of ring) {
        const key = `${lon.toFixed(4)},${lat.toFixed(4)}`
        let set = vertexOwners.get(key)
        if (!set) vertexOwners.set(key, (set = new Set()))
        set.add(x.id)
      }
    }
  }
  const adjacent = new Set()
  for (const set of vertexOwners.values()) {
    if (set.size < 2) continue
    const arr = [...set]
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) adjacent.add([arr[i], arr[j]].sort().join('|'))
  }

  // Vértices densificados (máx. ~25 km entre pontos) para medir a menor distância.
  const vecs = playable.map((x) => {
    const simple = turf.simplify(x.f, { tolerance: 0.02, highQuality: false })
    const pts = []
    for (const ring of rings(simple.geometry)) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        pts.push(a)
        const segKm = turf.distance(a, b)
        const steps = Math.floor(segKm / 25)
        for (let s = 1; s <= steps; s++) pts.push([a[0] + ((b[0] - a[0]) * s) / (steps + 1), a[1] + ((b[1] - a[1]) * s) / (steps + 1)])
      }
    }
    const arr = new Float64Array(pts.length * 3)
    pts.forEach((pt, i) => arr.set(toUnit(pt), i * 3))
    return arr
  })

  const ids = playable.map((x) => x.id)
  const n = ids.length
  const km = []
  const R = 6371
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (adjacent.has([ids[i], ids[j]].sort().join('|'))) {
        km.push(0)
        continue
      }
      const A = vecs[i]
      const B = vecs[j]
      let best = -2
      for (let a = 0; a < A.length; a += 3) {
        const ax = A[a], ay = A[a + 1], az = A[a + 2]
        for (let b = 0; b < B.length; b += 3) {
          const dot = ax * B[b] + ay * B[b + 1] + az * B[b + 2]
          if (dot > best) best = dot
        }
      }
      km.push(Math.round(Math.acos(Math.min(1, best)) * R))
    }
    if (i % 20 === 0) console.log(`distâncias: ${i}/${n}`)
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(
    path.join(OUT_DIR, 'countries.json'),
    JSON.stringify({
      source: 'Natural Earth Admin 0 – Countries 1:50m (domínio público)',
      generatedAt: new Date().toISOString().slice(0, 10),
      countries: out,
    }),
  )
  await fs.writeFile(path.join(OUT_DIR, 'distances.json'), JSON.stringify({ ids, km }))
  console.log(`Pronto: ${out.length} áreas, ${n} países jogáveis, ${adjacent.size} pares vizinhos.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
