// Fotos para os produtos do Na Etiqueta (e da categoria Preços do Mais ou Menos), buscadas no
// Wikimedia Commons pela API oficial (política de User-Agent da Wikimedia, 1 requisição/s, cache).
// Busca o tipo de produto (o nome sem tamanho, tirando palavras do começo — em geral a marca)
// e só aceita fotos com licença livre cujo título contenha todas as palavras buscadas.
// Uso: npx tsx scripts/data/na-etiqueta/images.ts [dias=400]
import fs from 'node:fs/promises'
import path from 'node:path'
import { dailyProduct, type Product } from '../../../src/games/na-etiqueta/logic'
// @ts-expect-error módulo .mjs sem tipos
import { ROOT, cachedFetchJson, commonsPage, commonsThumb } from '../lib/wikimedia.mjs'

const FILE = path.join(ROOT, 'public/data/na-etiqueta/products.json')
const DAYS = Number(process.argv[2] ?? 400)
const FREE = /^(CC0|Public domain|PD|CC BY(-SA)? [1-4]\.0)/i
const STOP = new Set(['and', 'with', 'the', 'of', 'in', 'organic', 'original', 'classic', 'premium', 'gourmet', 'signature', 'kirkland', 'fresh', 'natural', 'pack', 'variety'])

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const singular = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es)$/, '').replace(/s$/, '')

interface Page {
  title: string
  index: number
  imageinfo?: { extmetadata?: { LicenseShortName?: { value: string } } }[]
}

async function search(term: string): Promise<{ file: string; license: string } | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${term} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'extmetadata',
    iiextmetadatafilter: 'LicenseShortName',
  })
  const json = await cachedFetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, `commons-search-${fold(term).replace(/ /g, '_').slice(0, 80)}`)
  const pages: Page[] = Object.values(json?.query?.pages ?? {})
  const words = fold(term)
    .split(' ')
    .filter((w) => w.length >= 3)
    .map(singular)
  for (const p of pages.sort((a, b) => a.index - b.index)) {
    const title = fold(p.title.replace(/^File:/, ''))
    const license = p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value ?? ''
    if (!FREE.test(license)) continue
    if (/\b(price|preco|precio|logo|dj|rapper|singer|store|shop|supermarket|aisle|receipt)\b/.test(title)) continue
    if (!words.every((w) => title.includes(w))) continue
    return { file: p.title.replace(/^File:/, ''), license }
  }
  return null
}

function terms(p: Product): string[] {
  const words = p.name
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out: string[] = []
  for (let start = 0; start < words.length; start++) {
    const t = words.slice(start).filter((w) => !STOP.has(w.toLowerCase()))
    if (!t.length) continue
    const term = t.slice(-3).join(' ')
    if (!out.includes(term)) out.push(term)
  }
  return out.slice(0, 4)
}

async function main() {
  const data = JSON.parse(await fs.readFile(FILE, 'utf8'))
  const products: (Product & { image?: unknown })[] = data.products
  const byId = new Map(products.map((p) => [p.id, p]))
  const wanted = new Set<string>()
  for (let n = 1; n <= DAYS; n++) wanted.add(dailyProduct(products, n).id)
  let found = 0
  let i = 0
  for (const id of wanted) {
    i++
    const p = byId.get(id)!
    if (p.image) {
      found++
      continue
    }
    for (const term of terms(p)) {
      const hit = await search(term)
      if (hit) {
        p.image = { src: commonsThumb(hit.file), page: commonsPage(hit.file), license: hit.license, term }
        found++
        break
      }
    }
    if (i % 25 === 0) {
      console.log(`${i}/${wanted.size} produtos, ${found} com foto`)
      await fs.writeFile(FILE, JSON.stringify(data))
    }
  }
  await fs.writeFile(FILE, JSON.stringify(data))
  console.log(`Pronto: ${found} de ${wanted.size} produtos com foto`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
