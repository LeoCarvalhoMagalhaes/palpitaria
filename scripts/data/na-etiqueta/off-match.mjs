// Casa cada produto do Na Etiqueta com um produto do Open Food Facts (extraído por off-extract.mjs) e grava a
// foto da frente da embalagem (CC BY-SA, colaboradores do Open Food Facts). Exige a marca (quando o OFF a
// informa) e quase todas as palavras importantes do nome; casos duvidosos ficam sem foto.
// Uso: node scripts/data/na-etiqueta/off-match.mjs [--dry]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const FILE = path.join(ROOT, 'public/data/na-etiqueta/products.json')
const dry = process.argv.includes('--dry')

const STOP = new Set(
  'the and with of in for a an to w on oz lb lbs ct count pack fl ml l g kg each pk pc pcs bag box can jar bottle bottles cans variety size bulk full share single serve cups cup case ounce ounces quart gallon dozen'.split(' '),
)
const tokens = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t))

const rows = fs
  .readFileSync(path.join(ROOT, 'scripts/.cache/off/us-products.tsv'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [code, name, brands, quantity, img] = l.split('\t')
    return { code, name, brands, quantity, img, nameT: new Set(tokens(name)), brandT: new Set(tokens(brands)) }
  })

// Frequência das palavras (para pesar palavras raras, que identificam o produto).
const df = new Map()
const index = new Map()
rows.forEach((r, i) => {
  for (const t of new Set([...r.nameT, ...r.brandT])) {
    df.set(t, (df.get(t) ?? 0) + 1)
    if (!index.has(t)) index.set(t, [])
    index.get(t).push(i)
  }
})
const idf = (t) => Math.log(rows.length / (1 + (df.get(t) ?? 0)))

function best(product) {
  const pt = [...new Set(tokens(product.name))]
  if (pt.length < 2) return null
  // Candidatos: quem tem a palavra mais rara do nome.
  const rare = [...pt].filter((t) => df.has(t)).sort((a, b) => idf(b) - idf(a)).slice(0, 2)
  const cand = new Set(rare.flatMap((t) => (index.get(t) ?? []).slice(0, 20000)))
  let top = null
  for (const i of cand) {
    const r = rows[i]
    const all = new Set([...r.nameT, ...r.brandT])
    const total = pt.reduce((s, t) => s + idf(t), 0)
    const hit = pt.filter((t) => all.has(t)).reduce((s, t) => s + idf(t), 0)
    const coverage = hit / total
    // O nome do OFF não pode trazer muitas palavras que o nosso não tem (seria outro produto).
    const extra = [...r.nameT].filter((t) => !pt.includes(t)).reduce((s, t) => s + idf(t), 0)
    const brandOk = r.brandT.size === 0 || [...r.brandT].some((t) => pt.includes(t))
    if (!brandOk || coverage < 0.85 || extra > total * 0.6) continue
    const score = coverage - extra / (total * 4)
    if (!top || score > top.score) top = { r, score, coverage }
  }
  return top
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let matched = 0
const sample = []
for (const p of data.products) {
  const m = best(p)
  delete p.image
  if (!m) continue
  matched++
  // Foto em 400 px (tamanho padrão do servidor de imagens do OFF).
  const src = m.r.img.replace(/\.(\d+|full)\.jpg$/, '.400.jpg')
  p.image = { src, page: `https://world.openfoodfacts.org/product/${m.r.code}`, license: 'CC BY-SA 3.0, Open Food Facts', off: m.r.name }
  if (sample.length < 60) sample.push(`${p.name}  ⇒  ${m.r.name} [${m.r.brands}] ${m.coverage.toFixed(2)}`)
}
console.log(`${matched} de ${data.products.length} produtos com foto do Open Food Facts`)
console.log(sample.join('\n'))
if (!dry) fs.writeFileSync(FILE, JSON.stringify(data))
