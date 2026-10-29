import { Suspense } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { GAMES, stateSlug } from '@/config/games'
import { useL, useLang } from '@/core/settings'
import { GAME_COMPONENTS } from '@/games/registry'
import { dayIndex, isValidDateKey, puzzleNumber } from '@/core/daily'
import { useToday } from '@/core/hooks'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function GamePage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const today = useToday()
  const lang = useLang()
  const L = useL()
  const game = GAMES.find((g) => g.slug === slug)
  const Component = GAME_COMPONENTS[slug]
  if (!game || !Component) return <Navigate to="/" replace />

  // Só aceita datas do arquivo: depois do lançamento e antes de hoje.
  const requested = params.get('dia')
  const isArchive =
    isValidDateKey(requested) &&
    dayIndex(requested) < dayIndex(today) &&
    puzzleNumber(game.launchDate, requested) >= 1
  const date = isArchive ? requested : today

  return (
    <Suspense fallback={<LoadingScreen label={L(`Abrindo ${game.name}…`, `Opening ${game.name}…`)} />}>
      <Component
        key={`${slug}-${date}-${lang}`}
        game={game}
        today={today}
        date={date}
        number={puzzleNumber(game.launchDate, date)}
        isArchive={isArchive}
        stateKey={stateSlug(game, lang)}
      />
    </Suspense>
  )
}
