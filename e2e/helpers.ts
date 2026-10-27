import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const ROOT = path.resolve(import.meta.dirname, '..')

export function readData<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data', file), 'utf8')) as T
}

/** Fecha o "Como jogar" que abre sozinho na primeira visita. */
export async function closeHelp(page: Page) {
  const btn = page.getByRole('button', { name: 'Bora jogar!' })
  await btn.waitFor({ state: 'visible', timeout: 15_000 })
  await btn.click()
  await btn.waitFor({ state: 'hidden' })
}

/** Erros de página ignorando os que vêm de serviços externos (SoundCloud). */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}
