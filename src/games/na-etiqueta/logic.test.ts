import fs from 'node:fs'
import path from 'node:path'
import { dailyProduct, evaluatePrice, parsePrice, shareText, type Product } from './logic'

describe('Na Etiqueta', () => {
  it('vitória até 5% de diferença, nos dois sentidos', () => {
    expect(evaluatePrice(16.8, 16).closeness).toBe('win')
    expect(evaluatePrice(15.2, 16).closeness).toBe('win')
    expect(evaluatePrice(16.81, 16).closeness).not.toBe('win')
  })

  it('"perto" até 25% e "longe" acima disso', () => {
    expect(evaluatePrice(20, 16).closeness).toBe('near')
    expect(evaluatePrice(20.01, 16).closeness).toBe('far')
    expect(evaluatePrice(12, 16).closeness).toBe('near')
    expect(evaluatePrice(11.99, 16).closeness).toBe('far')
  })

  it('a seta mostra a direção do preço, não a distância', () => {
    expect(evaluatePrice(10, 16).arrow).toBe('up')
    expect(evaluatePrice(18, 16).arrow).toBe('down')
    expect(evaluatePrice(16, 16).arrow).toBe('check')
  })

  it('lê preços em vários formatos', () => {
    expect(parsePrice('12,90')).toBe(12.9)
    expect(parsePrice('12.90')).toBe(12.9)
    expect(parsePrice('1.234,56')).toBe(1234.56)
    expect(parsePrice('1,234.56')).toBe(1234.56)
    expect(parsePrice('12')).toBe(12)
    expect(parsePrice('US$ 7,5')).toBe(7.5)
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
    expect(parsePrice('0')).toBeNull()
  })

  it('texto de compartilhamento', () => {
    const g = [evaluatePrice(10, 16), evaluatePrice(18, 16), evaluatePrice(16, 16)]
    expect(shareText('Na Etiqueta', 3, g, true)).toBe('Na Etiqueta #3 3/6\n⬆️🟥\n⬇️🟨\n✅')
  })

  it('base de produtos válida e suficiente para mais de um ano', () => {
    const file = path.resolve(__dirname, '../../../public/data/na-etiqueta/products.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const products: Product[] = data.products
    expect(data.licenca).toContain('MIT')
    expect(products.length).toBeGreaterThan(365)
    for (const p of products) {
      expect(p.price).toBeGreaterThan(0)
      expect(p.name.length).toBeGreaterThan(2)
      expect(JSON.stringify(p)).not.toContain('costcofdb')
    }
    expect(dailyProduct(products, 1).id).toBe(dailyProduct(products, 1).id)
    expect(new Set(Array.from({ length: 365 }, (_, i) => dailyProduct(products, i + 1).id)).size).toBe(365)
  })
})
