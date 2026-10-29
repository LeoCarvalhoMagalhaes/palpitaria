// Gera os dados do Rastro:
//  - public/data/rastro/vocab.json : vocabulário aceito (verbetes do tesauro do LibreOffice que existem no VERO)
//  - public/data/rastro/day-XXX.json : para cada palavra secreta, a posição de cada palavra do vocabulário
//    no ranking de proximidade de sentido (1 = a própria palavra), codificada em Uint16 base64.
// Modelo: LaBSE (sentence-transformers/LaBSE, Apache-2.0), versão ONNX Xenova/LaBSE, rodando localmente.
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from '@huggingface/transformers'

const ROOT = path.resolve(import.meta.dirname, '../../..')
// RASTRO_LANG=en gera a versão em inglês em public/data/rastro-en.
const LANG = process.env.RASTRO_LANG === 'en' ? 'en' : 'pt'
const WORDS = path.join(ROOT, LANG === 'en' ? 'scripts/.cache/words-en' : 'scripts/.cache/words')
const OUT = path.join(ROOT, LANG === 'en' ? 'public/data/rastro-en' : 'public/data/rastro')
const CACHE = path.join(ROOT, `scripts/.cache/rastro-embeddings${LANG === 'en' ? '-en' : ''}.bin`)

const lines = async (file) => (await fs.readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean)
const fold = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

async function main() {
  // Vocabulário: as palavras mais frequentes do português do Brasil (FrequencyWords, OpenSubtitles 2018,
  // CC BY-SA 4.0) que existem no dicionário VERO (grafia atual, sem nomes próprios).
  // Em inglês: FrequencyWords en (mesma licença) filtrado pela lista dwyl/english-words (Unlicense).
  const forms = new Set(await lines(path.join(WORDS, LANG === 'en' ? 'words_alpha.txt' : 'forms.txt')))
  const freq = (await lines(path.join(WORDS, LANG === 'en' ? 'freq_en_50k.txt' : 'freq_pt_br_50k.txt'))).map((l) => l.split(' ')[0])
  const answers = (await lines(path.join(ROOT, `scripts/data/rastro/answers${LANG === 'en' ? '-en' : ''}.txt`)))
    .filter((l) => !l.startsWith('#'))
    .map((l) => l.trim())
  const letters = LANG === 'en' ? /^[a-z]+$/ : /^[a-záàâãéêíóôõúüç]+$/
  const vocabSet = new Set(freq.filter((w) => w.length >= 3 && w.length <= 16 && letters.test(w) && forms.has(w)))
  for (const a of answers) vocabSet.add(a)
  const vocab = [...vocabSet].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  console.log(`vocabulário: ${vocab.length} palavras, ${answers.length} respostas`)

  const dim = 768
  let matrix
  try {
    const buf = await fs.readFile(CACHE)
    matrix = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
    if (matrix.length !== vocab.length * dim) throw new Error('cache desatualizado')
    console.log('embeddings do cache')
  } catch {
    const extractor = await pipeline('feature-extraction', 'Xenova/LaBSE', { dtype: 'q8' })
    matrix = new Float32Array(vocab.length * dim)
    const batch = 64
    for (let i = 0; i < vocab.length; i += batch) {
      const chunk = vocab.slice(i, i + batch)
      const out = await extractor(chunk, { pooling: 'cls', normalize: true })
      matrix.set(out.data, i * dim)
      if ((i / batch) % 40 === 0) console.log(`embeddings: ${i}/${vocab.length}`)
    }
    await fs.writeFile(CACHE, Buffer.from(matrix.buffer))
  }

  await fs.mkdir(OUT, { recursive: true })
  const index = new Map(vocab.map((w, i) => [w, i]))
  const days = []
  answers.forEach((answer, d) => {
    const ai = index.get(answer)
    const sims = new Float32Array(vocab.length)
    for (let j = 0; j < vocab.length; j++) {
      let s = 0
      for (let k = 0; k < dim; k++) s += matrix[ai * dim + k] * matrix[j * dim + k]
      sims[j] = s
    }
    const order = [...sims.keys()].sort((a, b) => sims[b] - sims[a])
    const ranks = new Uint16Array(vocab.length)
    order.forEach((j, pos) => (ranks[j] = Math.min(pos + 1, 65535)))
    ranks[ai] = 1
    const file = `day-${String(d + 1).padStart(3, '0')}.json`
    days.push(file)
    const top = order.slice(1, 6).map((j) => vocab[j])
    fs.writeFile(path.join(OUT, file), JSON.stringify({ answer, ranks: Buffer.from(ranks.buffer).toString('base64') }))
    if (d < 5) console.log(`${answer}: ${top.join(', ')}`)
  })
  await fs.writeFile(
    path.join(OUT, 'vocab.json'),
    JSON.stringify({
      fonte:
        LANG === 'en'
          ? 'Vocabulário: FrequencyWords en (Hermit Dave, OpenSubtitles 2018, CC BY-SA 4.0) filtrado pela lista dwyl/english-words (Unlicense). Proximidade: modelo LaBSE (Apache-2.0).'
          : 'Vocabulário: FrequencyWords pt_BR (Hermit Dave, OpenSubtitles 2018, CC BY-SA 4.0) filtrado pelo dicionário VERO (LGPLv3/MPL). Proximidade: modelo LaBSE (Apache-2.0).',
      licenca: 'CC BY-SA 4.0 (lista de palavras derivada)',
      days: days.length,
      words: vocab,
    }),
  )
  console.log(`Pronto: ${days.length} dias`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
