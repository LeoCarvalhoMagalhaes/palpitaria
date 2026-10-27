import { useMemo } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Lightbulb } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { HINT_AFTER, MAX_GUESSES, compare, dailyArtist, flagEmoji, hintFor, shareText, type Artist, type Match } from './logic'

interface State {
  guesses: string[]
  /** Número de palpites feitos quando a dica foi usada (null = não usou). */
  hintAt: number | null
}

const MATCH_CLASS: Record<Match, string> = { correct: 'tile-hit', close: 'tile-near', miss: 'bg-muted text-foreground border-ink/10' }

export default function HolofoteGame(ctx: GameContext) {
  const data = useData(() => fetchData<{ artists: Artist[] }>('holofote/artists.json'))
  if (data.status === 'loading') return <LoadingScreen label="Acendendo o holofote…" />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} artists={data.data.artists} />
}

function Cell({ label, value, match, arrow, delay }: { label: string; value: string; match: Match; arrow?: 'up' | 'down' | null; delay: number }) {
  const arrowText = arrow === 'up' ? ', a resposta é maior' : arrow === 'down' ? ', a resposta é menor' : ''
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1 py-1.5 text-center ${MATCH_CLASS[match]}`}
      aria-label={`${label}: ${value}, ${match === 'correct' ? 'igual' : match === 'close' ? 'perto' : 'diferente'}${arrowText}`}
    >
      <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">{label}</span>
      <span className="flex items-center gap-0.5 font-heading text-sm leading-tight font-semibold sm:text-base">
        {value}
        {arrow === 'up' && <ArrowUp className="size-4 shrink-0" aria-hidden />}
        {arrow === 'down' && <ArrowDown className="size-4 shrink-0" aria-hidden />}
      </span>
    </motion.div>
  )
}

function Play({ ctx, artists }: { ctx: GameContext; artists: Artist[] }) {
  const { game, date, number } = ctx
  const answer = useMemo(() => dailyArtist(artists, number), [artists, number])
  const byId = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ guesses: [], hintAt: null }),
  })
  const finished = status === 'won' || status === 'lost'
  const guessed = state.guesses.map((id) => byId.get(id)!).filter(Boolean)
  const rows = guessed.map((g) => compare(g, answer))
  const won = state.guesses.includes(answer.id)

  const options: Option[] = useMemo(
    () => artists.map((a) => ({ id: a.id, label: a.name, hint: `${flagEmoji(a.country)} ${a.genre}` })),
    [artists],
  )

  const guess = (opt: Option) => {
    if (finished) return
    const guesses = [...state.guesses, opt.id]
    setState({ ...state, guesses })
    if (opt.id === answer.id) finish(true, String(guesses.length))
    else if (guesses.length >= MAX_GUESSES) finish(false, 'X')
  }

  const canHint = state.guesses.length >= HINT_AFTER && state.hintAt === null && !finished
  const share = shareText(game.shareName, number, rows, won, state.hintAt)

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'X']}
      highlightBucket={won ? String(state.guesses.length) : 'X'}
      help={
        <>
          <p>Descubra o <strong>artista do dia</strong> em até {MAX_GUESSES} palpites, entre os {artists.length} artistas mais ouvidos.</p>
          <p>Cada palpite mostra 6 pistas. <span className="rounded px-1 tile-hit">Verde</span> é igual; <span className="rounded px-1 tile-near">amarelo</span> está perto:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Estreia:</strong> ano do 1º álbum de estúdio. Amarelo se a diferença for de até 5 anos. ↑ estreou depois, ↓ antes.</li>
            <li><strong>Integrantes:</strong> 1 para artista solo.</li>
            <li><strong>Popularidade:</strong> posição no ranking de ouvintes. Amarelo até 50 posições. ↑ é mais popular.</li>
            <li><strong>Gênero:</strong> masculino, feminino, misto (grupo com homens e mulheres) ou não binário.</li>
            <li><strong>Estilo:</strong> um estilo musical por artista.</li>
            <li><strong>País:</strong> amarelo se for do mesmo continente.</li>
          </ul>
          <p>Travou? Depois do {HINT_AFTER}º palpite, use a <strong>dica</strong>.</p>
          <p className="text-muted-foreground">Dados: MusicBrainz e ListenBrainz (CC0).</p>
        </>
      }
      result={
        <>
          <p className="text-center text-base">
            Era <strong className="font-heading text-xl">{answer.name}</strong> {flagEmoji(answer.country)}
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      {!finished && (
        <div className="mb-3">
          <Autocomplete
            options={options}
            excludeIds={new Set(state.guesses)}
            label="Nome do artista"
            placeholder="Digite um artista…"
            onSelect={guess}
            onInvalid={(text, s) => toast.error(s ? `Não achei "${text}". Seria ${s.label}?` : `"${text}" não está na lista de artistas.`)}
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>
              Palpite {Math.min(state.guesses.length + 1, MAX_GUESSES)} de {MAX_GUESSES}
            </span>
            {state.hintAt === null && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!canHint}
                onClick={() => setState({ ...state, hintAt: state.guesses.length })}
                title={canHint ? 'Usar dica' : `A dica libera depois do ${HINT_AFTER}º palpite`}
              >
                <Lightbulb aria-hidden /> Dica {canHint ? '' : `(após ${HINT_AFTER})`}
              </Button>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="mx-auto mb-4 w-full max-w-sm space-y-2 text-center">
          <p className="font-heading text-xl">{won ? `Acertou! Era ${answer.name} 🎤` : `Era ${answer.name}. Amanhã tem mais!`}</p>
          <ShareButton text={share} />
        </div>
      )}

      <ol className="space-y-3" reversed>
        {[...guessed].reverse().map((g, ri) => {
          const i = guessed.length - 1 - ri
          const c = rows[i]
          const isAnswer = g.id === answer.id
          return (
            <li key={g.id} className={`rounded-2xl border-2 p-2 ${isAnswer ? 'border-hit' : 'border-ink/10'} bg-card`}>
              {state.hintAt !== null && state.hintAt === i + 1 && (
                <p className="mb-2 rounded-lg bg-sun/40 px-2 py-1 text-sm">💡 {hintFor(answer)}</p>
              )}
              <p className="mb-1.5 px-1 font-heading text-lg font-semibold">
                {g.name} {isAnswer && '🎯'}
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                <Cell label="Estreia" value={String(g.debut)} match={c.debut.match} arrow={c.debut.arrow} delay={0} />
                <Cell label="Integrantes" value={g.members === 1 ? 'Solo' : String(g.members)} match={c.members.match} delay={0.08} />
                <Cell label="Popularidade" value={`#${g.rank}`} match={c.popularity.match} arrow={c.popularity.arrow} delay={0.16} />
                <Cell label="Gênero" value={g.gender} match={c.gender.match} delay={0.24} />
                <Cell label="Estilo" value={g.genre} match={c.genre.match} delay={0.32} />
                <Cell label="País" value={`${flagEmoji(g.country)} ${g.countryName}`} match={c.country.match} delay={0.4} />
              </div>
            </li>
          )
        })}
      </ol>
      {guessed.length === 0 && <p className="text-center text-sm text-muted-foreground">Seus palpites aparecem aqui.</p>}
    </GameShell>
  )
}
