import { expect, test } from '@playwright/test'
import { GAMES } from '../src/config/games'
import { localDateKey, puzzleNumber } from '../src/core/daily'
import { dailyAngle } from '../src/games/grauzinho/logic'
import { dailyAnswer, fold } from '../src/games/palavreta/logic'
import { dailyProduct, type Product } from '../src/games/na-etiqueta/logic'
import { puzzleFor, type Puzzle } from '../src/games/junto/logic'
import { closeHelp, readData } from './helpers'

// Os testes nunca acessam o SoundCloud: o robots.txt dele pede que agentes automatizados não leiam o site.
test.beforeEach(async ({ page }) => {
  await page.route(/soundcloud\.com|sndcdn\.com/, (route) => route.abort())
})

const today = localDateKey()
const num = (slug: string) => puzzleNumber(GAMES.find((g) => g.slug === slug)!.launchDate, today)

test('Grauzinho: vence, compartilha e mantém o resultado ao recarregar', async ({ page }) => {
  const { answer } = dailyAngle(today)
  await page.goto('/grauzinho')
  await closeHelp(page)
  const input = page.getByLabel('Seu palpite em graus')
  const wrong = answer > 180 ? answer - 40 : answer + 40
  await input.fill(String(wrong))
  await page.getByRole('button', { name: 'Chutar!' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: `${wrong}°` })).toBeVisible()
  await input.fill(String(answer))
  await page.getByRole('button', { name: 'Chutar!' }).click()
  await expect(page.getByRole('heading', { name: 'Mandou bem! 🎉' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Prévia do compartilhamento').first()).toContainText(`Grauzinho #${num('grauzinho')} 2/4`)
  await page.keyboard.press('Escape')
  // Rodada bônus
  await page.getByRole('button', { name: /Rodada bônus/ }).click()
  await expect(page.getByRole('heading', { name: `Construa ${answer}°` })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: `Construa ${answer}°` })).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('1 de 11 feitos hoje')).toBeVisible()
})

test('Na Etiqueta: perde após 6 chutes e mostra o preço', async ({ page }) => {
  const { products } = readData<{ products: Product[] }>('na-etiqueta/products.json')
  const product = dailyProduct(products, num('na-etiqueta'))
  await page.goto('/na-etiqueta')
  await closeHelp(page)
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible()
  const field = page.getByLabel('Seu chute em dólares')
  await field.fill('abc')
  await page.getByRole('button', { name: 'Chutar' }).click()
  await expect(page.getByRole('alert')).toContainText('Chute inválido')
  const far = (product.price * 3).toFixed(2).replace('.', ',')
  for (let i = 0; i < 6; i++) {
    await field.fill(far)
    await page.getByRole('button', { name: 'Chutar' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Não foi dessa vez' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Prévia do compartilhamento').first()).toContainText('X/6')
})

test('Palavreta: rejeita palavra inexistente e vence com a palavra do dia', async ({ page }) => {
  const words = readData<{ answers: string[] }>('palavreta/words.json')
  const answer = fold(dailyAnswer(words.answers, num('palavreta')))
  await page.goto('/palavreta')
  await closeHelp(page)
  await page.keyboard.type('zzzzz')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Não conheço essa palavra')).toBeVisible()
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace')
  await page.keyboard.type(answer)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Mandou bem! 🎉' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Prévia do compartilhamento').first()).toContainText('🟩🟩🟩🟩🟩')
})

test('Juntô: erra um grupo, acerta os quatro e compartilha', async ({ page }) => {
  const { puzzles } = readData<{ puzzles: Puzzle[] }>('junto/puzzles.json')
  const puzzle = puzzleFor(puzzles, num('junto'))
  await page.goto('/junto')
  await closeHelp(page)
  const pick = async (words: string[]) => {
    for (const w of words) await page.getByRole('button', { name: w, exact: true }).click()
    await page.waitForTimeout(700)
  }
  const [g1, g2, g3, g4] = puzzle.grupos
  await pick([...g1.palavras.slice(0, 3), g2.palavras[0]])
  await expect(page.getByText('Tentativas: 1')).toBeVisible()
  for (const g of [g1, g2, g3, g4]) await pick(g.palavras)
  await expect(page.getByRole('heading', { name: 'Mandou bem! 🎉' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Prévia do compartilhamento').first()).toContainText('consegui em 5 tentativas')
})

test('Mais ou Menos: joga as 5 rodadas', async ({ page }) => {
  await page.goto('/mais-ou-menos')
  await closeHelp(page)
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /^Escolher / }).first().click()
    if (i < 4) await page.getByRole('button', { name: 'Próxima rodada' }).click()
  }
  await expect(page.getByLabel('Prévia do compartilhamento').first()).toContainText('/5', { timeout: 10_000 })
})

test('Holofote: palpite mostra as 6 pistas', async ({ page }) => {
  await page.goto('/holofote')
  await closeHelp(page)
  await page.getByLabel('Nome do artista').fill('Radiohead')
  await page.getByRole('option', { name: /Radiohead/ }).first().click()
  for (const label of ['Estreia', 'Integrantes', 'Popularidade', 'Gênero', 'Estilo', 'País']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
})

test('Rastro: aceita palavra conhecida e recusa desconhecida', async ({ page }) => {
  await page.goto('/rastro')
  await closeHelp(page)
  const field = page.getByLabel('Seu palpite')
  await field.fill('casa')
  await field.press('Enter')
  await expect(page.getByRole('listitem').filter({ hasText: 'casa' }).first()).toBeVisible()
  await field.fill('xyzqwe')
  await field.press('Enter')
  await expect(page.getByText('Não conheço essa palavra')).toBeVisible()
  await page.getByRole('button', { name: 'Dica' }).click()
  await expect(page.getByText('(dica)').first()).toBeVisible()
})

test('Mundaréu: palpite colore o país e mostra a distância', async ({ page }) => {
  await page.goto('/mundareu')
  await closeHelp(page)
  await page.getByLabel('Nome do país').fill('Brasil')
  await page.getByLabel('Nome do país').press('Enter')
  await expect(page.locator('ol li').filter({ hasText: 'Brasil' })).toBeVisible({ timeout: 15_000 })
})
