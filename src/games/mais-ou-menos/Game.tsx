import { useEffect, useMemo, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { ROUNDS, WIN_SCORE, dailyRounds, displayName, formatValue, isRight, shareText, type Category, type Item, type Round } from './logic'

interface State {
  choices: ('left' | 'right')[]
}

export default function MaisOuMenosGame(ctx: GameContext) {
  const data = useData(() => fetchData<{ categories: Category[] }>('mais-ou-menos/categories.json'))
  if (data.status === 'loading') return <LoadingScreen label="Pesando os números…" />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} categories={data.data.categories} />
}

function CountUp({ value, unit, run }: { value: number; unit: string; run: boolean }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(run && !reduce ? 0 : value)
  useEffect(() => {
    if (!run || reduce) {
      setShown(value)
      return
    }
    const controls = animate(0, value, { duration: 0.9, ease: [0.32, 0.72, 0, 1], onUpdate: (v) => setShown(Math.round(v)) })
    return () => controls.stop()
  }, [value, run, reduce])
  return <span className="tabular-nums">{formatValue(shown, unit)}</span>
}

function ItemCard({
  item,
  round,
  revealed,
  chosen,
  correct,
  onPick,
}: {
  item: Item
  round: Round
  revealed: boolean
  chosen: boolean
  correct: boolean
  onPick: () => void
}) {
  const other = item === round.left ? round.right : round.left
  const isBigger = item.value > other.value
  return (
    <motion.button
      type="button"
      disabled={revealed}
      onClick={onPick}
      whileTap={{ scale: 0.97 }}
      className={`flex min-h-44 flex-1 flex-col items-center justify-center gap-2 rounded-3xl p-4 text-center sticker sticker-press disabled:cursor-default ${
        revealed ? (isBigger ? 'tile-hit' : 'bg-card') : 'bg-card hover:bg-accent'
      } ${revealed && chosen ? 'ring-4 ring-brand-2 ring-offset-2 ring-offset-background' : ''}`}
      aria-label={revealed ? `${displayName(item.name)}: ${formatValue(item.value, round.category.unit)}` : `Escolher ${displayName(item.name)}`}
    >
      <span className="text-4xl" aria-hidden>{item.emoji}</span>
      <span className="font-heading text-xl leading-tight font-semibold sm:text-2xl">{displayName(item.name)}</span>
      {revealed && (
        <span className="font-heading text-lg">
          <CountUp value={item.value} unit={round.category.unit} run />
        </span>
      )}
      {revealed && chosen && <span className="text-sm font-semibold">{correct ? 'Sua escolha ✓' : 'Sua escolha ✗'}</span>}
    </motion.button>
  )
}

function Play({ ctx, categories }: { ctx: GameContext; categories: Category[] }) {
  const { game, date, number } = ctx
  const rounds = useMemo(() => dailyRounds(categories, number), [categories, number])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ choices: [] }),
  })
  const [viewing, setViewing] = useState(() => Math.min(state.choices.length, ROUNDS - 1))
  const results = state.choices.map((c, i) => isRight(rounds[i], c))
  const score = results.filter(Boolean).length
  const finished = status === 'won' || status === 'lost'
  const round = rounds[viewing]
  const answered = viewing < state.choices.length
  const choice = state.choices[viewing]

  const pick = (side: 'left' | 'right') => {
    if (answered || finished) return
    const choices = [...state.choices, side]
    setState({ choices })
    if (choices.length === ROUNDS) {
      const final = choices.filter((c, i) => isRight(rounds[i], c)).length
      finish(final >= WIN_SCORE, String(final), final)
    }
  }

  const share = shareText(game.shareName, number, results)

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['0', '1', '2', '3', '4', '5']}
      highlightBucket={finished ? String(score) : null}
      showAverage="Média de acertos"
      help={
        <>
          <p>São <strong>5 rodadas</strong>, cada uma de uma categoria. Em cada rodada, toque no item que tem <strong>mais</strong>.</p>
          <ul className="list-disc space-y-1 pl-5">
            {categories.map((c) => (
              <li key={c.id}>
                <strong>{c.name}:</strong> {c.question.toLowerCase()}
              </li>
            ))}
          </ul>
          <p>Acertando 3 ou mais, o dia conta como vitória para a sequência.</p>
          <p className="text-muted-foreground">Dados: Natural Earth, IBGE e Wikidata. Veja os créditos completos na página inicial.</p>
        </>
      }
      result={
        <>
          <p className="text-center">
            Você acertou <strong>{score} de {ROUNDS}</strong>.
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <ol className="mb-4 flex justify-center gap-2" aria-label="Rodadas">
        {rounds.map((r, i) => {
          const done = i < state.choices.length
          return (
            <li key={r.category.id}>
              <button
                type="button"
                disabled={i > state.choices.length}
                onClick={() => setViewing(i)}
                aria-current={i === viewing}
                aria-label={`Rodada ${i + 1}: ${r.category.name}`}
                className={`grid size-10 place-items-center rounded-full border-2 font-heading font-semibold ${
                  done ? (results[i] ? 'tile-hit' : 'tile-far') : i === viewing ? 'border-ink' : 'border-ink/15'
                } ${i === viewing ? 'ring-2 ring-brand-2 ring-offset-2 ring-offset-background' : ''}`}
              >
                {done ? (results[i] ? '✓' : '✗') : i + 1}
              </button>
            </li>
          )
        })}
      </ol>

      <motion.div key={viewing} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-xl">
        <p className="text-center text-sm font-semibold text-muted-foreground uppercase">
          Rodada {viewing + 1} de {ROUNDS} · {round.category.name}
        </p>
        <h2 className="mb-4 text-center font-heading text-2xl font-semibold">{round.category.question}</h2>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row">
          <ItemCard item={round.left} round={round} revealed={answered} chosen={choice === 'left'} correct={results[viewing]} onPick={() => pick('left')} />
          <div className="grid place-items-center font-heading text-lg font-bold text-muted-foreground" aria-hidden>
            OU
          </div>
          <ItemCard item={round.right} round={round} revealed={answered} chosen={choice === 'right'} correct={results[viewing]} onPick={() => pick('right')} />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Fonte: {round.category.fonte}</p>

        {answered && (
          <div className="mt-4 text-center">
            {viewing < ROUNDS - 1 ? (
              <Button variant="pop" size="xl" onClick={() => setViewing(viewing + 1)} autoFocus>
                {viewing + 1 < state.choices.length ? 'Ver próxima' : 'Próxima rodada'}
              </Button>
            ) : (
              <div className="mx-auto max-w-sm space-y-2">
                <p className="font-heading text-xl">{score === ROUNDS ? 'Gabaritou! ⚖️' : `${score} de ${ROUNDS}. Amanhã tem mais!`}</p>
                <ShareButton text={share} />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </GameShell>
  )
}
