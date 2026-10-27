import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { GAMES } from '../src/config/games'
import { closeHelp, trackErrors } from './helpers'

// Os testes não acessam serviços de música externos (Spotify, Apple): dados reais ficam para o teste manual.
test.beforeEach(async ({ page }) => {
  await page.route(/spotify\.com|scdn\.co|itunes\.apple\.com/, (route) => route.abort())
})

test('página inicial lista os 11 jogos com descrição e filtra por categoria', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Um palpite por dia')
  for (const g of GAMES) {
    await expect(page.getByRole('heading', { name: g.name, exact: true })).toBeVisible()
    await expect(page.getByText(g.description)).toBeVisible()
  }
  await page.getByRole('button', { name: 'Música' }).click()
  await expect(page.getByRole('heading', { name: 'Holofote', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Grauzinho', exact: true })).toHaveCount(0)
  await expect(page.getByText('0 de 11 feitos hoje')).toBeVisible()
})

for (const g of GAMES) {
  test(`${g.name} abre sem erros e mostra o "Como jogar"`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto(`/${g.slug}`)
    await expect(page.getByRole('heading', { name: `Como jogar ${g.name}` })).toBeVisible({ timeout: 20_000 })
    await closeHelp(page)
    await expect(page.getByRole('heading', { level: 1, name: g.name })).toBeVisible()
    // Reabrir o "Como jogar" pelo cabeçalho.
    await page.getByRole('button', { name: 'Como jogar' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('acessibilidade: página inicial sem violações graves', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0]?.message ?? "")).slice(0, 6).join(" | ")}`)).toEqual([])
})

for (const slug of ['grauzinho', 'na-etiqueta', 'palavreta', 'junto', 'mais-ou-menos']) {
  test(`acessibilidade: ${slug} sem violações graves`, async ({ page }) => {
    await page.goto(`/${slug}`)
    await closeHelp(page)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
  })
}

test('tema escuro e alto contraste são aplicados e lembrados', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Configurações' }).click()
  await page.getByRole('radio', { name: 'Escuro' }).click()
  await page.getByRole('switch').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('html')).toHaveClass(/hc/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('navegação por teclado chega aos cards dos jogos', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('href'))
  expect(focused).toMatch(/^\//)
})

test('arquivo: abre um desafio antigo que não conta na sequência', async ({ page }) => {
  await page.goto('/grauzinho')
  await closeHelp(page)
  await page.getByRole('button', { name: 'Jogos anteriores' }).click()
  await page.getByRole('dialog').getByRole('button').filter({ hasText: '#1' }).click()
  await expect(page.getByText('Você está jogando um desafio antigo')).toBeVisible()
  await expect(page).toHaveURL(/dia=\d{4}-\d{2}-\d{2}/)
})
