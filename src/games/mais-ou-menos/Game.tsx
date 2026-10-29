import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { Clapperboard, Lightbulb, Music, Search, Tag, type LucideIcon } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang } from '@/core/settings'
import { getPreview } from '@/core/preview'
import {
  CATEGORIES,
  DUELS_PER_CATEGORY,
  ROUNDS,
  SCORE_BUCKETS,
  WIN_SCORE,
  dailyRounds,
  displayName,
  formatValue,
  isRight,
  scoreBucket,
  shareText,
  type Category,
  type CategoryIcon,
  type Item,
  type Round,
} from './logic'

interface State {
  choices: ('left' | 'right')[]
}

const ICONS: Record<CategoryIcon, LucideIcon> = { search: Search, music: Music, film: Clapperboard, tag: Tag, lightbulb: Lightbulb }
/** Uma cor por categoria, para o ícone e a tela de abertura. */
const ICON_COLOR: Record<CategoryIcon, string> = {
  search: 'var(--brand-2)',
  music: 'var(--hit)',
  film: 'var(--brand)',
  tag: 'var(--far)',
  lightbulb: 'var(--near)',
}

export default function MaisOuMenosGame(ctx: GameContext) {
  const L = useL()
  const lang = useLang()
  const file = lang === 'en' ? 'mais-ou-menos/categories-en.json' : 'mais-ou-menos/categories.json'
  const data = useData(() => fetchData<{ categories: Category[] }>(file), [file])
  if (data.status === 'loading') return <LoadingScreen label={L('Pesando os números…', 'Weighing the numbers…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} categories={data.data.categories} />
}

function CategoryBadge({ icon, className = 'size-5' }: { icon: CategoryIcon; className?: string }) {
  const Icon = ICONS[icon] ?? Lightbulb
  return <Icon className={className} style={{ color: ICON_COLOR[icon] }} aria-hidden />
}

function CountUp({ value, unit, prefix, decimals, run }: { value: number; unit: string; prefix?: string; decimals?: number; run: boolean }) {
  const reduce = useReducedMotion()
  const lang = useLang()
  const [shown, setShown] = useState(run && !reduce ? 0 : value)
  useEffect(() => {
    if (!run || reduce) {
      setShown(value)
      return
    }
    const f = 10 ** (decimals ?? 0)
    const controls = animate(0, value, { duration: 0.9, ease: [0.32, 0.72, 0, 1], onUpdate: (v) => setShown(Math.round(v * f) / f) })
    return () => controls.stop()
  }, [value, run, reduce, decimals])
  return <span className="tabular-nums">{formatValue(shown, unit, prefix, decimals, lang)}</span>
}

/** Imagem do item: foto do Commons ou, nas músicas, a capa da Apple. Sem imagem, o emoji. */
function ItemImage({ item }: { item: Item }) {
  const [art, setArt] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (item.image || !item.appleId) return
    let alive = true
    getPreview(item.appleId)
      .then((i) => alive && setArt(i.artworkUrl))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [item])
  const src = item.image?.src ?? art
  return (
    <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-ink/10 bg-muted">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="grid size-full place-items-center text-5xl" aria-hidden>
          {item.emoji}
        </span>
      )}
    </span>
  )
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
  const L = useL()
  const lang = useLang()
  const other = item === round.left ? round.right : round.left
  const isBigger = item.value > other.value
  const value = formatValue(item.value, round.unit, round.category.prefix, round.category.decimals, lang)
  return (
    <motion.button
      type="button"
      disabled={revealed}
      onClick={onPick}
      whileTap={{ scale: 0.97 }}
      className={`flex flex-1 flex-col items-center gap-2 rounded-3xl p-3 text-center transition-colors duration-300 sticker sticker-press disabled:cursor-default ${
        revealed ? (isBigger ? 'tile-hit' : 'bg-card') : 'bg-card hover:bg-accent'
      } ${revealed && chosen ? 'ring-4 ring-brand-2 ring-offset-2 ring-offset-background' : ''}`}
      aria-label={revealed ? `${displayName(item.name)}: ${value}` : L(`Escolher ${displayName(item.name)}`, `Pick ${displayName(item.name)}`)}
    >
      <ItemImage item={item} />
      <span className="font-heading text-lg leading-tight font-semibold sm:text-xl">{displayName(item.name)}</span>
      <span className="min-h-7 font-heading text-lg">
        {revealed ? <CountUp value={item.value} unit={round.unit} prefix={round.category.prefix} decimals={round.category.decimals} run /> : '?'}
      </span>
      {revealed && chosen && <span className="text-sm font-semibold">{correct ? L('Sua escolha ✓', 'Your pick ✓') : L('Sua escolha ✗', 'Your pick ✗')}</span>}
    </motion.button>
  )
}

function Play({ ctx, categories }: { ctx: GameContext; categories: Category[] }) {
  const { game, date, number } = ctx
  const L = useL()
  const reduce = useReducedMotion()
  const rounds = useMemo(() => dailyRounds(categories, number), [categories, number])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 2,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ choices: [] }),
  })
  const [viewing, setViewing] = useState(() => Math.min(state.choices.length, ROUNDS - 1))
  // Abertura de categoria: aparece antes do 1º duelo de cada categoria ainda não jogada.
  const [introDone, setIntroDone] = useState<Set<number>>(() => new Set(Array.from({ length: Math.ceil(state.choices.length / DUELS_PER_CATEGORY) }, (_, i) => i)))
  const results = state.choices.map((c, i) => isRight(rounds[i], c))
  const score = results.filter(Boolean).length
  const finished = status === 'won' || status === 'lost'
  const round = rounds[viewing]
  const answered = viewing < state.choices.length
  const choice = state.choices[viewing]
  const showIntro = !answered && round.duel === 0 && !introDone.has(round.categoryIndex)
  const icons = categories.slice(0, CATEGORIES).map((c) => c.icon)

  const closeIntro = () => setIntroDone((s) => new Set(s).add(round.categoryIndex))
  useEffect(() => {
    if (!showIntro) return
    const t = window.setTimeout(closeIntro, 2200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro, viewing])

  const pick = (side: 'left' | 'right') => {
    if (answered || finished) return
    const choices = [...state.choices, side]
    setState({ choices })
    if (choices.length === ROUNDS) {
      const final = choices.filter((c, i) => isRight(rounds[i], c)).length
      finish(final >= WIN_SCORE, scoreBucket(final), final)
    }
  }

  const share = shareText(game.shareName, number, results, icons)
  const slide = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: { opacity: 0, x: 48 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -48 } }
  const lastOfCategory = round.duel === DUELS_PER_CATEGORY - 1
  const triviaHint = L('população, área, cidades, montanhas ou rios', 'population, area, cities, mountains or rivers')

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={SCORE_BUCKETS}
      highlightBucket={finished ? scoreBucket(score) : null}
      showAverage={L('Média de acertos', 'Average score')}
      help={
        <>
          {L(
            <p>São <strong>5 categorias</strong> com <strong>5 duelos</strong> cada, 25 no total. Em cada duelo, toque no item que tem <strong>mais</strong>.</p>,
            <p>There are <strong>5 categories</strong> with <strong>5 duels</strong> each, 25 in total. In each duel, tap the one that has <strong>more</strong>.</p>,
          )}
          <ul className="space-y-1.5">
            {categories.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <CategoryBadge icon={c.icon} className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>{c.name}:</strong> {c.groups ? triviaHint : c.question.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          {L(
            <p>Acertando {WIN_SCORE} ou mais, o dia conta como vitória para a sequência.</p>,
            <p>Get {WIN_SCORE} or more right and the day counts as a win for your streak.</p>,
          )}
          <p className="text-muted-foreground">
            {L(
              'Dados: Wikipédia, Kworb, Wikidata, outro jogo, Natural Earth e IBGE. Imagens: Wikimedia Commons e capas da Apple Music. Veja os créditos completos.',
              'Data: Wikipedia, Kworb, Wikidata, outro jogo, Natural Earth and IBGE. Images: Wikimedia Commons and Apple Music artwork. See the full credits.',
            )}
          </p>
        </>
      }
      result={
        <>
          <p className="text-center">
            {L('Você acertou', 'You got')} <strong>{score} {L('de', 'of')} {ROUNDS}</strong>.
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <ol className="mb-4 grid grid-cols-5 gap-1.5" aria-label={L('Categorias', 'Categories')}>
        {categories.slice(0, CATEGORIES).map((c, ci) => (
          <li key={c.id} className={`rounded-xl border-2 p-1.5 transition-colors ${round.categoryIndex === ci ? 'border-ink bg-card' : 'border-ink/10'}`}>
            <div className="flex items-center justify-center gap-1">
              <CategoryBadge icon={c.icon} className="size-4" />
              <span className="sr-only">{c.name}</span>
            </div>
            <div className="mt-1 flex justify-center gap-0.5">
              {Array.from({ length: DUELS_PER_CATEGORY }, (_, d) => {
                const i = ci * DUELS_PER_CATEGORY + d
                const done = i < state.choices.length
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={i > state.choices.length}
                    onClick={() => setViewing(i)}
                    aria-label={`${c.name}, ${L('duelo', 'duel')} ${d + 1}${done ? (results[i] ? L(': acertou', ': right') : L(': errou', ': wrong')) : ''}`}
                    aria-current={i === viewing}
                    className={`size-2.5 rounded-full transition-all sm:size-3 ${done ? (results[i] ? 'bg-hit' : 'bg-far') : 'bg-ink/15'} ${i === viewing ? 'scale-125 ring-2 ring-brand-2' : ''}`}
                  />
                )
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="relative mx-auto w-full max-w-xl overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {showIntro ? (
            <motion.button
              key={`intro-${round.categoryIndex}`}
              type="button"
              {...slide}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              onClick={closeIntro}
              className="flex w-full flex-col items-center gap-3 rounded-3xl bg-card px-6 py-10 text-center sticker"
            >
              <motion.span
                initial={reduce ? false : { scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                className="grid size-20 place-items-center rounded-full bg-muted"
              >
                <CategoryBadge icon={round.category.icon} className="size-10" />
              </motion.span>
              <span className="text-sm font-semibold text-muted-foreground uppercase">
                {L('Categoria', 'Category')} {round.categoryIndex + 1} {L('de', 'of')} {CATEGORIES}
              </span>
              <span className="font-heading text-3xl font-semibold">{round.category.name}</span>
              <span className="text-muted-foreground">{round.category.groups ? displayName(triviaHint) : round.category.question}</span>
              <span className="mt-2 rounded-full bg-ink px-5 py-2 font-semibold text-background">{L('Começar', 'Start')} →</span>
            </motion.button>
          ) : (
            <motion.div key={`duel-${viewing}`} {...slide} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
              <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-muted-foreground uppercase">
                <CategoryBadge icon={round.category.icon} className="size-4" />
                {round.category.name} · {L('duelo', 'duel')} {round.duel + 1}/{DUELS_PER_CATEGORY}
              </p>
              <h2 className="mb-4 text-center font-heading text-2xl font-semibold">{round.question}</h2>
              <div className="flex items-stretch gap-2 sm:gap-3">
                <ItemCard item={round.left} round={round} revealed={answered} chosen={choice === 'left'} correct={results[viewing]} onPick={() => pick('left')} />
                <div className="grid place-items-center font-heading text-sm font-bold text-muted-foreground sm:text-lg" aria-hidden>
                  {L('OU', 'OR')}
                </div>
                <ItemCard item={round.right} round={round} revealed={answered} chosen={choice === 'right'} correct={results[viewing]} onPick={() => pick('right')} />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {L('Fonte', 'Source')}: {round.category.fonte}
              </p>

              {answered && (
                <motion.div className="mt-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.5 }}>
                  {viewing < ROUNDS - 1 ? (
                    <Button variant="pop" size="xl" onClick={() => setViewing(viewing + 1)} autoFocus>
                      {viewing + 1 < state.choices.length
                        ? L('Ver próximo', 'See next')
                        : lastOfCategory
                          ? L('Próxima categoria →', 'Next category →')
                          : L('Próximo duelo', 'Next duel')}
                    </Button>
                  ) : (
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="font-heading text-xl">
                        {score === ROUNDS ? L('Gabaritou! ⚖️', 'Perfect score! ⚖️') : L(`${score} de ${ROUNDS}. Amanhã tem mais!`, `${score} of ${ROUNDS}. More tomorrow!`)}
                      </p>
                      <ShareButton text={share} />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameShell>
  )
}
