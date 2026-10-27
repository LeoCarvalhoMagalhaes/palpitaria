// Gera public/data/na-etiqueta/products.json a partir do games.json do outro jogo (licença MIT,
// Copyright (c) 2023 KermWasTaken). Descarta as URLs de imagem, separa o tamanho do nome e
// atribui uma categoria por palavras-chave (ilustrada por emoji na interface).
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const SRC = path.join(ROOT, 'scripts/.cache/precos/games.json')
const OUT = path.join(ROOT, 'public/data/na-etiqueta/products.json')

export const CATEGORIES = [
  ['Temperos e molhos', /\b(sauce|ketchup|mustard|mayo(nnaise)?|dressing|salsa|seasoning|spices?|salt|vinegar|olive oil|oil|honey|syrup|jam|preserves|peanut butter|hummus|pesto|marinade|bouillon|cinnamon)\b/i],
  ['Café e chá', /\b(coffee|espresso|teas?|chai|matcha|k-cups?|creamer)\b/i],
  ['Padaria', /\b(bread|bagels?|buns?|muffins?|croissants?|tortillas?|cakes?|pies?|rolls?|baguettes?|brioche|danish|donuts?|pita|naan|chapati|roti)\b/i],
  ['Doces e salgadinhos', /\b(chocolates?|cand(y|ies)|cookies?|chips|crackers?|pretzels?|popcorn|snacks?|gumm(y|ies)|bars?|truffles?|caramels?|fudge|wafers?|brownies?|ice cream|gelato|marshmallows?|nuts|almonds?|cashews?|pistachios?|walnuts?|pecans?|trail mix|granola)\b/i],
  ['Peixes e frutos do mar', /\b(salmon|tuna|shrimp|cod|tilapia|crab|lobster|scallops?|fish|seafood|sardines?|anchov(y|ies)|oysters?|clams?|mussels?|halibut|mahi)\b/i],
  ['Carnes', /\b(beef|steaks?|chicken|pork|bacon|sausages?|ham|turkey|lamb|burgers?|jerky|meatballs?|hot dogs?|brisket|ribs|salami|pepperoni|prosciutto|wings|nuggets?)\b/i],
  ['Laticínios e ovos', /\b(cheeses?|milk|yogurts?|butter|cream|eggs?|ghee|mozzarella|cheddar|parmesan|brie|feta|kefir)\b/i],
  ['Frutas e verduras', /\b(apples?|bananas?|berr(y|ies)|blueberr(y|ies)|strawberr(y|ies)|grapes?|oranges?|lemons?|limes?|mangos?|avocados?|tomato(es)?|potato(es)?|onions?|lettuce|spinach|kale|broccoli|carrots?|peppers|melons?|watermelons?|peach(es)?|pears?|cherr(y|ies)|pineapples?|kiwis?|salads?|vegetables?|mushrooms?|cucumbers?|corn|squash|asparagus|cauliflower|beans|blend)\b/i],
  ['Congelados', /\b(frozen|pizzas?|dumplings?|potstickers?|waffles?|burritos?|lasagna|ravioli)\b/i],
  ['Bebidas', /\b(water|soda|juices?|sparkling|cola|coke|pepsi|sprite|beer|wine|kombucha|lemonade|gatorade|drinks?|beverages?|energy|seltzer|smoothies?)\b/i],
  ['Mercearia', /.*/],
]

const EMOJI = {
  'Café e chá': '☕', Bebidas: '🥤', 'Peixes e frutos do mar': '🐟', Carnes: '🥩', 'Laticínios e ovos': '🧀',
  Padaria: '🍞', 'Frutas e verduras': '🥦', 'Doces e salgadinhos': '🍫', Congelados: '🧊', 'Temperos e molhos': '🧂', Mercearia: '🛒',
}

const SIZE_RE = /(\d[\d.,]*\s*(x\s*\d[\d.,]*\s*)?(oz|fl\.? ?oz|lbs?|ct|count|pk|pack|g|kg|ml|l|liters?|gal(lon)?s?|qt|pt|servings?|sheets|pieces?|pcs)\b.*)$/i

export function splitName(raw) {
  const clean = raw.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim()
  const comma = clean.lastIndexOf(',')
  if (comma > 0 && /\d/.test(clean.slice(comma + 1))) {
    return { name: clean.slice(0, comma).trim(), size: clean.slice(comma + 1).trim() }
  }
  const m = clean.match(SIZE_RE)
  if (m && m.index > 3) return { name: clean.slice(0, m.index).replace(/[\s,(-]+$/, '').trim(), size: m[1].replace(/[()]/g, '').trim() }
  return { name: clean, size: '' }
}

export function categorize(name) {
  return CATEGORIES.find(([, re]) => re.test(name))[0]
}

async function main() {
  const src = JSON.parse(await fs.readFile(SRC, 'utf8'))
  const seen = new Set()
  const products = []
  for (const [key, item] of Object.entries(src)) {
    const { name, size } = splitName(item.name)
    const dedupe = `${name}|${size}`.toLowerCase()
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    const price = Number(String(item.price).replace(/[$,\s]/g, ''))
    if (!Number.isFinite(price) || price <= 0) continue
    const category = categorize(name)
    products.push({ id: key.replace('game-', 'p'), name, size, price, category, emoji: EMOJI[category] })
  }
  const counts = {}
  for (const p of products) counts[p.category] = (counts[p.category] ?? 0) + 1
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(
    OUT,
    JSON.stringify({
      fonte: 'games.json do repositório KermWasTaken',
      licenca: 'MIT — Copyright (c) 2023 KermWasTaken',
      url: 'https://github.com/KermWasTaken',
      referencia: 'Preços em US$ de um atacado dos EUA, base compilada em 2022–2023',
      obtido_em: new Date().toISOString().slice(0, 10),
      products,
    }),
  )
  console.log(`${products.length} produtos únicos`, counts)
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('build.mjs')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
