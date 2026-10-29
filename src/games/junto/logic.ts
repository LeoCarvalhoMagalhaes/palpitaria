import { seededShuffle } from '@/core/daily'

export interface Group {
  nivel: 1 | 2 | 3 | 4
  categoria: string
  palavras: string[]
}

export interface Puzzle {
  id: string
  status: 'rascunho' | 'aprovado' | 'rejeitado'
  grupos: Group[]
  /** Palavra → categorias em que ela também parece caber (pistas falsas intencionais). */
  ambiguas: Record<string, string[]>
}

export const GROUP_EMOJI: Record<number, string> = { 1: '🟧', 2: '🟩', 3: '🟦', 4: '🟪' }
export const GROUP_COLOR: Record<number, string> = { 1: '#b35900', 2: '#237a45', 3: '#1864ab', 4: '#862e9c' }

export function puzzleFor(puzzles: Puzzle[], number: number): Puzzle {
  const usable = puzzles.filter((p) => p.status !== 'rejeitado')
  return usable[(number - 1 + usable.length * 1000) % usable.length]
}

export function shuffledWords(puzzle: Puzzle, seed: string): string[] {
  return seededShuffle(
    puzzle.grupos.flatMap((g) => g.palavras),
    `${puzzle.id}:${seed}`,
  )
}

export function groupOf(word: string, puzzle: Puzzle): Group {
  return puzzle.grupos.find((g) => g.palavras.includes(word))!
}

/** Grupo que contém exatamente as 4 palavras selecionadas, ou null. */
export function matchGroup(selected: string[], puzzle: Puzzle): Group | null {
  if (selected.length !== 4) return null
  return puzzle.grupos.find((g) => selected.every((w) => g.palavras.includes(w))) ?? null
}

/**
 * Próxima dica (regra observada no original): com 3 grupos achados não há dica; a 1ª dica mostra
 * 2 palavras do grupo mais fácil ainda não achado; a 2ª dica completa 3 palavras do mesmo grupo.
 */
export function nextHint(puzzle: Puzzle, solvedNiveis: number[], currentHint: string[]): string[] {
  if (solvedNiveis.length >= 3 || currentHint.length >= 3) return currentHint
  if (currentHint.length === 2) return groupOf(currentHint[0], puzzle).palavras.slice(0, 3)
  const open = puzzle.grupos.filter((g) => !solvedNiveis.includes(g.nivel)).sort((a, b) => a.nivel - b.nivel)
  return open[0].palavras.slice(0, 2)
}

export type Move = { kind: 'guess'; nivel: number | null } | { kind: 'hint' }

export function shareText(siteLabel: string, number: number, moves: Move[], lang: 'pt' | 'en' = 'pt'): string {
  const attempts = moves.filter((m) => m.kind === 'guess').length
  const hints = moves.filter((m) => m.kind === 'hint').length
  const emojis = moves.map((m) => (m.kind === 'hint' ? '💡' : m.nivel ? GROUP_EMOJI[m.nivel] : '❌'))
  const rows: string[] = []
  for (let i = 0; i < emojis.length; i += 10) rows.push(emojis.slice(i, i + 10).join(''))
  if (lang === 'en') {
    const hintEn = hints ? ` and ${hints} ${hints === 1 ? 'hint' : 'hints'}` : ''
    return `I played ${siteLabel} #${number} and got it in ${attempts} tries${hintEn}\n${rows.join('\n')}`
  }
  const hintText = hints ? ` e ${hints} ${hints === 1 ? 'dica' : 'dicas'}` : ''
  return `Joguei ${siteLabel} #${number} e consegui em ${attempts} tentativas${hintText}\n${rows.join('\n')}`
}

/**
 * Conta quantas formas existem de distribuir as 16 palavras em grupos de 4, considerando os grupos
 * oficiais e as ambiguidades declaradas. Um quebra-cabeça válido tem exatamente 1 solução.
 */
export function countSolutions(puzzle: Puzzle): number {
  const cats = puzzle.grupos.map((g) => g.categoria)
  const words = puzzle.grupos.flatMap((g) => g.palavras)
  const options = words.map((w) => {
    const own = groupOf(w, puzzle).categoria
    const extra = (puzzle.ambiguas[w] ?? []).filter((c) => cats.includes(c))
    return [...new Set([own, ...extra])].map((c) => cats.indexOf(c))
  })
  const fill = cats.map(() => 0)
  let solutions = 0
  const walk = (i: number) => {
    if (solutions > 1) return
    if (i === words.length) {
      if (fill.every((n) => n === 4)) solutions += 1
      return
    }
    for (const g of options[i]) {
      if (fill[g] >= 4) continue
      fill[g] += 1
      walk(i + 1)
      fill[g] -= 1
    }
  }
  walk(0)
  return solutions
}

export function validatePuzzle(puzzle: Puzzle): string[] {
  const errors: string[] = []
  const words = puzzle.grupos.flatMap((g) => g.palavras)
  if (puzzle.grupos.length !== 4) errors.push('precisa de 4 grupos')
  if (puzzle.grupos.some((g) => g.palavras.length !== 4)) errors.push('cada grupo precisa de 4 palavras')
  const folded = words.map((w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
  if (new Set(folded).size !== 16) errors.push('palavras repetidas')
  if (new Set(puzzle.grupos.map((g) => g.nivel)).size !== 4) errors.push('níveis 1 a 4 precisam ser únicos')
  if (words.some((w) => /\s/.test(w))) errors.push('use palavras sem espaço')
  for (const [w, cats] of Object.entries(puzzle.ambiguas)) {
    if (!words.includes(w)) errors.push(`ambígua inexistente: ${w}`)
    for (const c of cats) if (!puzzle.grupos.some((g) => g.categoria === c)) errors.push(`categoria inexistente: ${c}`)
  }
  if (!errors.length && countSolutions(puzzle) !== 1) errors.push('mais de uma solução possível')
  return errors
}
