import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameContext } from '@/components/GameShell'

type GameComponent = LazyExoticComponent<ComponentType<GameContext>>

/** Cada jogo vira um pedaço separado do bundle, baixado só quando aberto. */
export const GAME_COMPONENTS: Record<string, GameComponent> = {
  mundareu: lazy(() => import('./mundareu/Game')),
  'na-etiqueta': lazy(() => import('./na-etiqueta/Game')),
  grauzinho: lazy(() => import('./grauzinho/Game')),
  junto: lazy(() => import('./junto/Game')),
  palavreta: lazy(() => import('./palavreta/Game')),
  'toca-ai': lazy(() => import('./toca-ai/Game')),
  'letra-por-letra': lazy(() => import('./letra-por-letra/Game')),
  'mais-ou-menos': lazy(() => import('./mais-ou-menos/Game')),
  rastro: lazy(() => import('./rastro/Game')),
  holofote: lazy(() => import('./holofote/Game')),
  'refrao-cruzado': lazy(() => import('./refrao-cruzado/Game')),
}
