// Acesso às APIs da Wikimedia seguindo a política de User-Agent e a de uso do Wikidata Query Service:
// identificação no User-Agent, consultas em lote, cache local e espera ao receber 429/5xx.
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '../../..')
export const UA = 'Palpitaria/0.1 (https://github.com/LeoCarvalhoMagalhaes/palpitaria; dados para jogos diários)'
const CACHE = path.join(ROOT, 'scripts/.cache/wikimedia')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function cachedFetchJson(url, name, headers = {}) {
  await fs.mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, `${name}.json`)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let attempt = 0; attempt < 7; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } })
    if (res.ok) {
      const json = await res.json()
      await fs.writeFile(file, JSON.stringify(json))
      await sleep(400)
      return json
    }
    if (res.status === 404) return null
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`)
    const wait = Number(res.headers.get('retry-after')) || 20 * (attempt + 1)
    console.log(`  ${res.status}, aguardando ${wait}s…`)
    await sleep(wait * 1000)
  }
  throw new Error(`indisponível: ${url}`)
}

/** Consulta SPARQL ao Wikidata (resultado em cache pelo nome). */
export async function sparql(query, name) {
  const json = await cachedFetchJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, name, {
    Accept: 'application/sparql-results+json',
  })
  return json?.results?.bindings ?? []
}

/** Nome do arquivo a partir de uma URL "Special:FilePath" devolvida pelo Wikidata. */
export function fileFromCommonsUrl(url) {
  const m = /Special:FilePath\/(.+)$/.exec(url)
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null
}

/** URL da miniatura no Commons (o servidor só aceita alguns tamanhos; 330 px é um deles). */
export function commonsThumb(file, width = 330) {
  const n = file.replace(/ /g, '_')
  const h = crypto.createHash('md5').update(n).digest('hex')
  let url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(n)}/${width}px-${encodeURIComponent(n)}`
  if (/\.(svg|tiff?|pdf)$/i.test(n)) url += /\.svg$/i.test(n) ? '.png' : '.jpg'
  return url
}

export const commonsPage = (file) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`

/** Imagem pronta para o site: miniatura + página do arquivo (onde ficam autor e licença). */
export function imageRef(file) {
  return file ? { src: commonsThumb(file), page: commonsPage(file) } : null
}

export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
