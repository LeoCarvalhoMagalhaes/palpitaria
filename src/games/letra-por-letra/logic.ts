import { pickDaily } from '@/core/daily'

export const ROUNDS = 5
/** Acertos mínimos para o dia contar como vitória (sequência). */
export const WIN_SCORE = 3

export interface WordEntry {
  palavra: string
  definicao: string
  frase: string
}

export type Bank = Record<'1' | '2' | '3' | '4' | '5', WordEntry[]>

export function dailyWords(bank: Bank, number: number): WordEntry[] {
  return (['1', '2', '3', '4', '5'] as const).map((lvl) => pickDaily(bank[lvl], number, `letra-por-letra:${lvl}`))
}

/** Compara a grafia: ignora maiúsculas e espaços nas pontas, mas acentos e cedilha contam. */
export function isCorrect(typed: string, word: string): boolean {
  return typed.trim().toLocaleLowerCase('pt-BR').normalize('NFC') === word.toLocaleLowerCase('pt-BR').normalize('NFC')
}

/** A frase de exemplo vem com ___ no lugar da palavra; para falar, a lacuna vira a palavra. */
export function sentenceForSpeech(entry: WordEntry): string {
  return entry.frase.replace('___', entry.palavra)
}

export function shareText(name: string, number: number, results: boolean[]): string {
  const score = results.filter(Boolean).length
  return `${name} #${number} ${score}/${ROUNDS}\n${results.map((r) => (r ? '🟩' : '🟥')).join('')}`
}
