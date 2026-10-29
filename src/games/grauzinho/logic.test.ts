import { dailyAngle, evaluateConstruct, evaluateGuess, filledSquares, shareText, warmthLabel } from './logic'

describe('Grauzinho', () => {
  it('gera o mesmo ângulo para a mesma data e ângulos diferentes em dias diferentes', () => {
    expect(dailyAngle('2026-10-27')).toEqual(dailyAngle('2026-10-27'))
    const answers = new Set(Array.from({ length: 30 }, (_, i) => dailyAngle(`2026-11-${String(i + 1).padStart(2, '0')}`).answer))
    expect(answers.size).toBeGreaterThan(20)
  })

  it('sempre gera resposta inteira entre 5 e 355', () => {
    for (let i = 0; i < 400; i++) {
      const { answer } = dailyAngle(`2027-01-01#${i}`)
      expect(Number.isInteger(answer)).toBe(true)
      expect(answer).toBeGreaterThanOrEqual(5)
      expect(answer).toBeLessThanOrEqual(355)
    }
  })

  it('rótulos de temperatura nos limites', () => {
    expect(warmthLabel(9)).toBe('Fervendo! 🔥')
    expect(warmthLabel(10)).toBe('Quente!')
    expect(warmthLabel(-19)).toBe('Quente!')
    expect(warmthLabel(20)).toBe('Esquentando')
    expect(warmthLabel(99)).toBe('Frio!')
    expect(warmthLabel(100)).toBe('Congelando! 🥶')
  })

  it('seta indica para onde ir', () => {
    expect(evaluateGuess(50, 65).direction).toBe('up')
    expect(evaluateGuess(73, 65).direction).toBe('down')
    expect(evaluateGuess(65, 65).direction).toBe('solved')
  })

  it('quadrados do compartilhamento nos limites', () => {
    expect(filledSquares(4)).toBe(4)
    expect(filledSquares(5)).toBe(3)
    expect(filledSquares(9)).toBe(3)
    expect(filledSquares(10)).toBe(2)
    expect(filledSquares(49)).toBe(1)
    expect(filledSquares(50)).toBe(0)
    expect(filledSquares(0)).toBe(5)
  })

  it('rótulos em inglês', () => {
    expect(warmthLabel(5, 'en')).toBe('Boiling! 🔥')
    expect(evaluateGuess(65, 65, 'en').label).toBe('Bullseye! 🎯')
    expect(evaluateConstruct(94, 100, 'en').hint).toBe('Open it more')
    expect(evaluateConstruct(97, 100).off).toBe(3)
  })

  it('rodada bônus vale ±5°', () => {
    expect(evaluateConstruct(95, 100).solved).toBe(true)
    expect(evaluateConstruct(94, 100).solved).toBe(false)
    expect(evaluateConstruct(94, 100).hint).toBe('Abra mais')
    expect(evaluateConstruct(110, 100).hint).toBe('Feche mais')
  })

  it('monta o texto de compartilhamento', () => {
    const g = [evaluateGuess(50, 65), evaluateGuess(62, 65), evaluateGuess(65, 65)]
    expect(shareText('Grauzinho', 8, g, true, { attempts: 2, solved: true })).toBe(
      'Grauzinho #8 3/4 · 📐 2/3\n⬆️ 🟧🟧⬜⬜⬜\n⬆️ 🟧🟧🟧🟧⬜\n🎉 🟩🟩🟩🟩🟩',
    )
  })
})
