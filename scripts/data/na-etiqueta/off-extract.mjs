// Extrai do despejo CSV do Open Food Facts (ODbL; fotos CC BY-SA) os produtos vendidos nos EUA que têm foto da frente.
// O arquivo é baixado e lido em fluxo (1,5 GB compactado), sem guardar o original.
// Saída: scripts/.cache/off/us-products.tsv (código, nome, marcas, quantidade, url da foto da frente)
// Uso: node scripts/data/na-etiqueta/off-extract.mjs
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const OUT_DIR = path.join(ROOT, 'scripts/.cache/off')
const URL = 'https://openfoodfacts-ds.s3.eu-west-3.amazonaws.com/en.openfoodfacts.org.products.csv.gz'
const UA = 'Palpitaria/1.0 (jogo diario sem fins lucrativos; https://github.com/LeoCarvalhoMagalhaes/palpitaria)'

fs.mkdirSync(OUT_DIR, { recursive: true })
const out = fs.createWriteStream(path.join(OUT_DIR, 'us-products.tsv'))

https.get(URL, { headers: { 'User-Agent': UA } }, (res) => {
  if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`)
  const lines = readline.createInterface({ input: res.pipe(zlib.createGunzip()), crlfDelay: Infinity })
  let header = null
  let idx = {}
  let n = 0
  let kept = 0
  lines.on('line', (line) => {
    const cols = line.split('\t')
    if (!header) {
      header = cols
      for (const k of ['code', 'product_name', 'brands', 'quantity', 'countries_en', 'image_url']) idx[k] = header.indexOf(k)
      return
    }
    n++
    if (n % 500000 === 0) console.log(`${n} linhas, ${kept} mantidas`)
    const countries = cols[idx.countries_en] ?? ''
    const img = cols[idx.image_url] ?? ''
    const name = cols[idx.product_name] ?? ''
    if (!img || !name || !/United States/.test(countries)) return
    kept++
    out.write([cols[idx.code], name, cols[idx.brands] ?? '', cols[idx.quantity] ?? '', img].map((s) => s.replace(/\s+/g, ' ')).join('\t') + '\n')
  })
  lines.on('close', () => {
    out.end()
    console.log(`Pronto: ${n} linhas lidas, ${kept} produtos dos EUA com foto`)
  })
})
