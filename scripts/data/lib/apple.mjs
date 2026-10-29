// Consulta em lote ao /lookup do iTunes (permitido pelo robots.txt; /search não é usado).
// Até 150 IDs por pedido, uma pausa entre pedidos e cache local por lote.
import fs from 'node:fs/promises'
import path from 'node:path'
import { ROOT, UA, chunk } from './wikimedia.mjs'

const CACHE = path.join(ROOT, 'scripts/.cache/apple')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Devolve Map(id → resultado do iTunes) para os IDs que existem na loja (tenta US e depois BR). */
export async function appleLookup(ids, name) {
  await fs.mkdir(CACHE, { recursive: true })
  const found = new Map()
  for (const country of ['US', 'BR']) {
    const missing = [...new Set(ids.map(String))].filter((id) => !found.has(id))
    for (const [i, batch] of chunk(missing, 150).entries()) {
      const file = path.join(CACHE, `${name}-${country}-${i}-${batch.length}-${batch[0]}.json`)
      let json
      try {
        json = JSON.parse(await fs.readFile(file, 'utf8'))
      } catch {
        for (let attempt = 0; attempt < 5; attempt++) {
          const res = await fetch(`https://itunes.apple.com/lookup?id=${batch.join(',')}&country=${country}`, { headers: { 'User-Agent': UA } })
          if (res.ok) {
            json = await res.json()
            break
          }
          await sleep(5000 * (attempt + 1))
        }
        if (!json) throw new Error(`lookup falhou (${name} ${country} ${i})`)
        await fs.writeFile(file, JSON.stringify(json))
        await sleep(1500)
      }
      for (const r of json.results) {
        const id = String(r.trackId ?? r.collectionId)
        if (batch.includes(id) && !found.has(id)) found.set(id, r)
      }
    }
  }
  return found
}

/** Troca o tamanho da arte do iTunes (100x100bb) pelo pedido. */
export const artwork = (url, size) => (url ? String(url).replace(/\/\d+x\d+bb\./, `/${size}bb.`) : null)
