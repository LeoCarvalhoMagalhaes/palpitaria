import { expect, test } from '@playwright/test'
import { GAMES } from '../src/config/games'
import { closeHelp } from './helpers'

// Os testes não acessam serviços de música externos (Spotify, Apple): dados reais ficam para o teste manual.
test.beforeEach(async ({ page }) => {
  await page.route(/spotify\.com|scdn\.co|itunes\.apple\.com/, (route) => route.abort())
})

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test('celular: página inicial sem rolagem horizontal', async ({ page }) => {
  await page.goto('/')
  await noHorizontalScroll(page)
})

for (const g of GAMES) {
  test(`celular: ${g.name} cabe na tela`, async ({ page }) => {
    await page.goto(`/${g.slug}`)
    await closeHelp(page)
    await page.waitForTimeout(500)
    await noHorizontalScroll(page)
  })
}
