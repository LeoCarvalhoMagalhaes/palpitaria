/**
 * Teste com áudio real (prévias da Apple). Faz poucas requisições e só roda quando pedido:
 *   AUDIO_REAL=1 npx playwright test e2e/audio-real.spec.ts --project=desktop
 */
import { expect, test } from '@playwright/test'
import { GAMES } from '../src/config/games'
import { MUSIC_CATEGORIES, type Song } from '../src/config/music'
import { localDateKey, puzzleNumber } from '../src/core/daily'
import { availableCategories, dailySong } from '../src/games/toca-ai/logic'
import { closeHelp, readData } from './helpers'

test.skip(!process.env.AUDIO_REAL, 'Defina AUDIO_REAL=1 para testar com áudio real')
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

test('trechos tocam com a duração certa', async ({ page }) => {
  await page.goto('/verificar-audio')
  const first = page.getByTestId('audio-check-song').first()
  for (const ms of [130, 530, 2000, 8000]) {
    await first.getByRole('button', { name: new RegExp(`^Tocar ${ms < 1000 ? (ms / 1000).toLocaleString('pt-BR') : ms / 1000}s`) }).click()
    const result = first.getByTestId(`result-${ms}`)
    await expect(result).toContainText('✓', { timeout: ms + 20000 })
    const measured = Number((await result.textContent())!.match(/(\d+) ms/)![1])
    console.log(`trecho de ${ms} ms → medido ${measured} ms`)
    expect(Math.abs(measured - ms)).toBeLessThan(120)
  }
})

test('Toca Aí: toca, pula, acerta e mostra a capa e os links', async ({ page }) => {
  const { songs } = readData<{ songs: Song[] }>('musicas/songs.json')
  const n = puzzleNumber(GAMES.find((g) => g.slug === 'toca-ai')!.launchDate, localDateKey())
  const cat = availableCategories(MUSIC_CATEGORIES, songs)[0]
  const answer = dailySong(cat, songs, n)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/toca-ai')
  await closeHelp(page)
  await page.getByRole('button', { name: /^Ouvir/ }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /^Ouvir/ })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: /^Pular/ }).click()
  await expect(page.getByText('trecho de 0,53s')).toBeVisible()
  await page.getByLabel('Nome da música').fill(answer.title)
  await page.getByRole('option', { name: new RegExp(answer.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
  await expect(page.getByText('Acertou! 🎉')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ouvir na Apple Music' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: 'Abrir no Spotify' })).toBeVisible()
  expect(errors).toEqual([])
})

test('Refrão Cruzado: começa e toca a pista', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const consoleErrors: string[] = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  await page.goto('/refrao-cruzado')
  await closeHelp(page)
  await page.getByRole('button', { name: 'Começar' }).click()
  await expect(page.getByRole('grid', { name: 'Cruzadinha' })).toBeVisible()
  await page.getByRole('button', { name: 'Tocar o trecho desta pista' }).click()
  await page.waitForTimeout(3000)
  expect(errors).toEqual([])
  expect(consoleErrors.filter((e) => !/favicon/.test(e))).toEqual([])
})
