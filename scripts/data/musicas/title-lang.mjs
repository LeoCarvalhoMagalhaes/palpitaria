// Marca o idioma do título de cada música (titleLang: 'en' | 'pt' | 'es' | 'other') em songs.json.
// Usado pelo Refrão Cruzado para avisar "(em inglês)" nas pistas. Heurística offline:
// palavras do título na lista de frequência do inglês (FrequencyWords, CC BY-SA) vs. palavras típicas de pt/es.
// Uso: node scripts/data/musicas/title-lang.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SONGS = path.join(ROOT, 'public/data/musicas/songs.json')
const FREQ = path.join(ROOT, 'scripts/.cache/words-en/freq_en_50k.txt')

const PT = new Set('não nao você voce pra pro meu minha eu coração coracao saudade ela ele tão nós nos vou vai quero amor beijo uma um dos das sem com'.split(' '))
const ES = new Set('el la los las mi tu yo quiero corazón corazon amor baila bailando que te y con sin una un del despacito mía mia bebé bebe noche vida'.split(' '))

export function titleLang(title, english) {
  const clean = title
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*$/, ' ')
    .toLowerCase()
    .replace(/’/g, "'")
  if (/[ãõç]/.test(clean)) return 'pt'
  if (/[ñ¿¡]/.test(clean)) return 'es'
  const words = clean.match(/[a-záéíóúâêôàü']+/g) ?? []
  if (!words.length) return 'other'
  const pt = words.filter((w) => PT.has(w)).length
  const es = words.filter((w) => ES.has(w)).length
  const en = words.filter((w) => english.has(w) || english.has(w.split("'")[0])).length
  if (en / words.length >= 0.75 && pt + es < Math.max(1, words.length / 2)) return 'en'
  if (pt > es && pt > 0) return 'pt'
  if (es > 0) return 'es'
  return 'other'
}

async function main() {
  const freq = await fs.readFile(FREQ, 'utf8')
  // As 30 mil palavras mais comuns: cobre títulos em inglês sem aceitar nomes próprios raros.
  const english = new Set(
    freq
      .split('\n')
      .slice(0, 30000)
      .map((l) => l.split(' ')[0])
      .filter(Boolean),
  )
  const data = JSON.parse(await fs.readFile(SONGS, 'utf8'))
  const count = {}
  for (const s of data.songs) {
    s.titleLang = titleLang(s.title, english)
    count[s.titleLang] = (count[s.titleLang] ?? 0) + 1
  }
  await fs.writeFile(SONGS, JSON.stringify(data))
  console.log(count)
  for (const lang of ['pt', 'es', 'other']) console.log(lang, data.songs.filter((s) => s.titleLang === lang).slice(0, 12).map((s) => s.title).join(' | '))
}

main()
