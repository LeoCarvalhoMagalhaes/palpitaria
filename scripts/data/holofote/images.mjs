// Acrescenta a foto de cada artista (Wikidata P18, arquivo do Wikimedia Commons) a
// public/data/holofote/artists.json, ligando pelo ID do MusicBrainz (P434).
import fs from 'node:fs/promises'
import path from 'node:path'
import { ROOT, chunk, fileFromCommonsUrl, imageRef, sparql } from '../lib/wikimedia.mjs'

const FILE = path.join(ROOT, 'public/data/holofote/artists.json')

async function main() {
  const data = JSON.parse(await fs.readFile(FILE, 'utf8'))
  const images = new Map()
  const batches = chunk(data.artists.map((a) => a.id), 150)
  for (const [i, ids] of batches.entries()) {
    const rows = await sparql(
      `SELECT ?mbid ?img WHERE { VALUES ?mbid { ${ids.map((id) => `"${id}"`).join(' ')} } ?a wdt:P434 ?mbid; wdt:P18 ?img. }`,
      `holofote-images-${i}`,
    )
    for (const r of rows) if (!images.has(r.mbid.value)) images.set(r.mbid.value, fileFromCommonsUrl(r.img.value))
    console.log(`lote ${i + 1}/${batches.length}: ${images.size} fotos`)
  }
  let count = 0
  for (const a of data.artists) {
    const ref = imageRef(images.get(a.id) ?? null)
    if (ref) count++
    a.image = ref
  }
  data.sources = [...(data.sources ?? []).filter((s) => !/Commons/.test(s.name)), { name: 'Fotos: Wikimedia Commons via Wikidata (P18)', url: 'https://commons.wikimedia.org/', license: 'Licença de cada arquivo (ver página do arquivo)' }]
  await fs.writeFile(FILE, JSON.stringify(data))
  console.log(`Pronto: ${count} de ${data.artists.length} artistas com foto`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
