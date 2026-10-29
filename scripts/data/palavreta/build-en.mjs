// Gera public/data/palavreta/words-en.json:
//  - respostas: answers-en.txt (curadoria própria), conferidas na lista dwyl/english-words
//  - palpites válidos: todas as palavras de 5 letras da lista dwyl/english-words (Unlicense)
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const lines = async (f) => (await fs.readFile(f, 'utf8')).split(/\r?\n/).filter(Boolean)

const dict = (await lines(path.join(ROOT, 'scripts/.cache/words-en/words_alpha.txt'))).filter((w) => /^[a-z]{5}$/.test(w))
const valid = new Set(dict)
const raw = (await lines(path.join(ROOT, 'scripts/data/palavreta/answers-en.txt'))).filter((l) => !l.startsWith('#')).map((l) => l.trim())
const seen = new Set()
const answers = []
const rejected = []
for (const w of raw) {
  if (!/^[a-z]{5}$/.test(w) || !valid.has(w) || seen.has(w)) rejected.push(w)
  else {
    seen.add(w)
    answers.push(w)
  }
}
await fs.writeFile(
  path.join(ROOT, 'public/data/palavreta/words-en.json'),
  JSON.stringify({
    fonte: 'Respostas: curadoria própria. Palpites: dwyl/english-words',
    licenca: 'Unlicense (domínio público)',
    url: 'https://github.com/dwyl/english-words',
    answers,
    valid: [...valid].sort(),
    display: {},
  }),
)
console.log(`${answers.length} respostas, ${valid.size} palpites válidos. Rejeitadas: ${rejected.join(', ') || 'nenhuma'}`)
