import { expect, test } from '@playwright/test'
import { GAMES } from '../src/config/games'
import { closeHelp } from './helpers'

// Os testes nunca acessam o SoundCloud: o robots.txt dele pede que agentes automatizados não leiam o site.
test.beforeEach(async ({ page }) => {
  await page.route(/soundcloud\.com|sndcdn\.com/, (route) => route.abort())
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
