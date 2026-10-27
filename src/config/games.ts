export type GameCategory = 'palavras' | 'musica' | 'geo-numeros' | 'logica'

export interface GameMeta {
  slug: string
  name: string
  emoji: string
  /** Descrição de uma linha para o card da página inicial. */
  description: string
  category: GameCategory
  /** Cor de destaque do jogo (card e cabeçalho). */
  color: string
  /** Primeiro dia do desafio #1 (data local, YYYY-MM-DD). */
  launchDate: string
  /** Rótulo usado no texto de compartilhamento. */
  shareName: string
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
    category: 'palavras',
    color: '#9c36b5',
    launchDate: LAUNCH,
    shareName: 'Juntô',
  },
  {
    slug: 'palavreta',
    name: 'Palavreta',
    emoji: '🔤',
    description: 'Adivinhe a palavra secreta. As cores mostram o quão perto você está.',
    category: 'palavras',
    color: '#2f9e44',
    launchDate: LAUNCH,
    shareName: 'Palavreta',
  },
  {
    slug: 'toca-ai',
    name: 'Toca Aí',
    emoji: '🎧',
    description: 'Ouça um trechinho e adivinhe a música. Errou? O trecho aumenta.',
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
    category: 'palavras',
    color: '#f08c00',
    launchDate: LAUNCH,
    shareName: 'Letra por Letra',
  },
  {
    slug: 'mais-ou-menos',
    name: 'Mais ou Menos',
    emoji: '⚖️',
    description: 'Qual dos dois tem mais? 5 rodadas, 5 categorias.',
    category: 'geo-numeros',
    color: '#0c8599',
    launchDate: LAUNCH,
    shareName: 'Mais ou Menos',
  },
  {
    slug: 'rastro',
    name: 'Rastro',
    emoji: '🧭',
    description: 'Ache a palavra secreta pelo sentido. O número mostra a distância.',
    category: 'palavras',
    color: '#5f3dc4',
    launchDate: LAUNCH,
    shareName: 'Rastro',
  },
  {
    slug: 'holofote',
    name: 'Holofote',
    emoji: '🎤',
    description: 'Adivinhe o artista do dia pelas pistas em 10 tentativas.',
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
    category: 'musica',
    color: '#3b5bdb',
    launchDate: LAUNCH,
    shareName: 'Refrão Cruzado',
  },
]

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  palavras: 'Palavras',
  musica: 'Música',
  'geo-numeros': 'Geografia e números',
  logica: 'Lógica',
}

export function getGame(slug: string): GameMeta {
  const game = GAMES.find((g) => g.slug === slug)
  if (!game) throw new Error(`Jogo desconhecido: ${slug}`)
  return game
}
