// Baixa uma vez as imagens do Wikimedia Commons usadas pelos jogos, converte para WebP (até 480 px) e passa a
// servi-las pelo próprio site (public/img/c/). Motivo: o upload.wikimedia.org responde 429 quando muitas
// miniaturas são pedidas de uma vez, e várias opções ficavam sem imagem. O link para a página do arquivo
// (autor e licença) continua em `image.page`.
// Uso: node scripts/data/lib/localize-images.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { ROOT, UA } from './wikimedia.mjs'

const OUT = path.join(ROOT, 'public/img/c')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let limited = 0

/** Arquivos de dados e onde estão os itens com `image` dentro de cada um. */
const TARGETS = [
  ['public/data/mais-ou-menos/categories.json', (d) => d.categories.flatMap((c) => c.items)],
  ['public/data/mais-ou-menos/categories-en.json', (d) => d.categories.flatMap((c) => c.items)],
  ['public/data/holofote/artists.json', (d) => d.artists],
]

async function download(src) {
  // Miniatura de 330 px, a que o site já usava: costuma estar pronta no cache do Commons. Tamanhos que ainda
  // precisariam ser gerados (500 px) recebem 429 com frequência.
  const url = src
  for (let attempt = 0; attempt < 8; attempt++) {
    // Tempo limite: uma conexão parada travou uma rodada inteira por horas.
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }).catch(() => null)
    if (!res) continue
    if (res.ok) return Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)))
    // 429: espera o que o servidor pedir (Retry-After) ou 20 s, e conta para o log.
    if (res.status === 429) limited++
    const retry = Number(res.headers.get('retry-after'))
    await sleep(res.status === 429 ? Math.max(20000, (retry || 0) * 1000) : 3000)
  }
  return null
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const done = new Map()
  let fetched = 0
  let failed = 0
  for (const [file, items] of TARGETS) {
    const full = path.join(ROOT, file)
    const data = JSON.parse(await fs.readFile(full, 'utf8'))
    for (const item of items(data)) {
      const src = item.image?.src
      if (!src || !src.startsWith('https://upload.wikimedia.org/')) continue
      const name = crypto.createHash('sha1').update(src).digest('hex').slice(0, 16) + '.webp'
      if (!done.has(src)) {
        const dest = path.join(OUT, name)
        let ok = await fs.stat(dest).then(() => true, () => false)
        if (!ok) {
          const buf = await download(src)
          if (buf) {
            await sharp(buf).resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toFile(dest)
            ok = true
            fetched++
            if (fetched % 25 === 0) console.log(`${new Date().toISOString().slice(11, 19)} ${fetched} imagens baixadas, ${limited} respostas 429`)
            await sleep(1000)
          } else failed++
        }
        done.set(src, ok ? `img/c/${name}` : src)
      }
      item.image.src = done.get(src)
    }
    await fs.writeFile(full, JSON.stringify(data))
    console.log(`${file}: atualizado`)
  }
  console.log(`Pronto: ${fetched} novas, ${failed} falharam`)
}


main()
