import type { Lang } from '@/core/settings'

export type GameCategory = 'palavras' | 'musica' | 'geo-numeros' | 'logica'

export interface GameMeta {
  slug: string
  name: string
  emoji: string
  /** Descrição de uma linha para o card da página inicial. */
  description: string
  descriptionEn: string
  category: GameCategory
  /** Cor de destaque do jogo (card e cabeçalho). */
  color: string
  /** Primeiro dia do desafio #1 (data local, YYYY-MM-DD). */
  launchDate: string
  /** Rótulo usado no texto de compartilhamento. */
  shareName: string
  /** O conteúdo muda com o idioma (palavras): desafio e estatísticas separados por idioma. */
  langDependent?: boolean
}

export const SITE_NAME = 'Palpitaria'
export const SITE_URL = 'https://leocarvalhomagalhaes.github.io/palpitaria/'

const LAUNCH = '2026-10-20'

export const GAMES: GameMeta[] = [
  {
    slug: 'mundareu',
    name: 'Mundaréu',
    emoji: '🌍',
    description: 'Descubra o país secreto. Quanto mais quente a cor, mais perto você está.',
    descriptionEn: 'Find the mystery country. The warmer the color, the closer you are.',
    category: 'geo-numeros',
    color: '#e8590c',
    launchDate: LAUNCH,
    shareName: 'Mundaréu',
  },
  {
    slug: 'na-etiqueta',
    name: 'Na Etiqueta',
    emoji: '🏷️',
    description: 'Chute o preço do produto do dia em até 6 tentativas.',
    descriptionEn: "Guess the price of today's product in up to 6 tries.",
    category: 'geo-numeros',
    color: '#2b8a3e',
    launchDate: LAUNCH,
    shareName: 'Na Etiqueta',
  },
  {
    slug: 'grauzinho',
    name: 'Grauzinho',
    emoji: '📐',
    description: 'Quantos graus tem esse ângulo? Você tem 4 chances.',
    descriptionEn: 'How many degrees is this angle? You get 4 tries.',
    category: 'logica',
    color: '#1971c2',
    launchDate: LAUNCH,
    shareName: 'Grauzinho',
  },
  {
    slug: 'junto',
    name: 'Juntô',
    emoji: '🧩',
    description: 'Forme 4 grupos de 4 palavras que têm algo em comum.',
    descriptionEn: 'Make 4 groups of 4 words that have something in common.',
    category: 'palavras',
    color: '#9c36b5',
    launchDate: LAUNCH,
    shareName: 'Juntô',
    langDependent: true,
  },
  {
    slug: 'palavreta',
    name: 'Palavreta',
    emoji: '🔤',
    description: 'Adivinhe a palavra secreta. As cores mostram o quão perto você está.',
    descriptionEn: 'Guess the secret word. The colors show how close you are.',
    category: 'palavras',
    color: '#2f9e44',
    launchDate: LAUNCH,
    shareName: 'Palavreta',
    langDependent: true,
  },
  {
    slug: 'toca-ai',
    name: 'Toca Aí',
    emoji: '🎧',
    description: 'Ouça um trechinho e adivinhe a música. Errou? O trecho aumenta.',
    descriptionEn: 'Listen to a tiny clip and guess the song. Wrong? The clip gets longer.',
    category: 'musica',
    color: '#e64980',
    launchDate: LAUNCH,
    shareName: 'Toca Aí',
  },
  {
    slug: 'letra-por-letra',
    name: 'Letra por Letra',
    emoji: '🐝',
    description: 'Ouça a palavra e escreva certinho. São 5 rodadas.',
    descriptionEn: 'Hear the word and spell it right. 5 rounds.',
    category: 'palavras',
    color: '#f08c00',
    launchDate: LAUNCH,
    shareName: 'Letra por Letra',
    langDependent: true,
  },
  {
    slug: 'mais-ou-menos',
    name: 'Mais ou Menos',
    emoji: '⚖️',
    description: 'Qual dos dois tem mais? 5 categorias, 5 duelos em cada.',
    descriptionEn: 'Which one has more? 5 categories, 5 matchups each.',
    category: 'geo-numeros',
    color: '#0c8599',
    launchDate: LAUNCH,
    shareName: 'Mais ou Menos',
    langDependent: true,
  },
  {
    slug: 'rastro',
    name: 'Rastro',
    emoji: '🧭',
    description: 'Ache a palavra secreta pelo sentido. O número mostra a distância.',
    descriptionEn: 'Find the secret word by meaning. The number shows how far you are.',
    category: 'palavras',
    color: '#5f3dc4',
    launchDate: LAUNCH,
    shareName: 'Rastro',
    langDependent: true,
  },
  {
    slug: 'holofote',
    name: 'Holofote',
    emoji: '🎤',
    description: 'Adivinhe o artista do dia pelas pistas em 10 tentativas.',
    descriptionEn: "Guess today's artist from the clues in 10 tries.",
    category: 'musica',
    color: '#c2255c',
    launchDate: LAUNCH,
    shareName: 'Holofote',
  },
  {
    slug: 'refrao-cruzado',
    name: 'Refrão Cruzado',
    emoji: '🎼',
    description: 'Palavras cruzadas em que as pistas são músicas.',
    descriptionEn: 'A crossword where the clues are songs.',
    category: 'musica',
    color: '#3b5bdb',
    launchDate: LAUNCH,
    shareName: 'Refrão Cruzado',
    langDependent: true,
  },
]

export const CATEGORY_LABELS: Record<GameCategory, { pt: string; en: string }> = {
  palavras: { pt: 'Palavras', en: 'Words' },
  musica: { pt: 'Música', en: 'Music' },
  'geo-numeros': { pt: 'Geografia e números', en: 'Geography & numbers' },
  logica: { pt: 'Lógica', en: 'Logic' },
}

export function getGame(slug: string): GameMeta {
  const game = GAMES.find((g) => g.slug === slug)
  if (!game) throw new Error(`Jogo desconhecido: ${slug}`)
  return game
}

export function gameDescription(game: GameMeta, lang: Lang): string {
  return lang === 'en' ? game.descriptionEn : game.description
}

/** Chave do estado salvo: jogos que dependem do idioma guardam o progresso de cada idioma separado. */
export function stateSlug(game: GameMeta, lang: Lang): string {
  return game.langDependent && lang === 'en' ? `${game.slug}-en` : game.slug
}
