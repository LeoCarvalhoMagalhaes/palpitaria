import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { toast } from 'sonner'
import { Lightbulb, Shuffle, X } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { seededShuffle } from '@/core/daily'
import { useDailyGame } from '@/core/hooks'
import { GROUP_COLOR, matchGroup, nextHint, puzzleFor, shareText, shuffledWords, type Move, type Puzzle } from './logic'

interface State {
  moves: Move[]
  solved: number[]
  hint: string[]
  /** Combinações erradas já tentadas (para avisar repetição). */
  tried: string[]
}

export default function JuntoGame(ctx: GameContext) {
  const data = useData(() => fetchData<{ puzzles: Puzzle[] }>('junto/puzzles.json'))
  if (data.status === 'loading') return <LoadingScreen label="Separando as palavras…" />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} puzzles={data.data.puzzles} />
}

function Play({ ctx, puzzles }: { ctx: GameContext; puzzles: Puzzle[] }) {
  const { game, date, number } = ctx
  const puzzle = useMemo(() => puzzleFor(puzzles, number), [puzzles, number])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ moves: [], solved: [], hint: [], tried: [] }),
  })
  const [order, setOrder] = useState(() => shuffledWords(puzzle, date))
  const [selected, setSelected] = useState<string[]>([])
  const [shake, setShake] = useState(0)

  const solvedGroups = state.solved.map((n) => puzzle.grupos.find((g) => g.nivel === n)!)
  const solvedWords = new Set(solvedGroups.flatMap((g) => g.palavras))
  const remaining = order.filter((w) => !solvedWords.has(w))
  const attempts = state.moves.filter((m) => m.kind === 'guess').length
  const hints = state.moves.filter((m) => m.kind === 'hint').length
  const finished = status === 'won'

  useEffect(() => {
    if (selected.length !== 4 || finished) return
    const t = window.setTimeout(() => {
      const key = [...selected].sort().join('|')
      if (state.tried.includes(key)) {
        toast('Você já tentou essa combinação 😉')
        setSelected([])
        return
      }
      const group = matchGroup(selected, puzzle)
      const move: Move = { kind: 'guess', nivel: group?.nivel ?? null }
      const moves = [...state.moves, move]
      if (group) {
        const solved = [...state.solved, group.nivel]
        const hint = state.hint.some((w) => group.palavras.includes(w)) ? [] : state.hint
        setState({ ...state, moves, solved, hint })
        if (solved.length === 4) finish(true, attempts + 1 > 9 ? '10+' : String(attempts + 1), attempts + 1)
      } else {
        setState({ ...state, moves, tried: [...state.tried, key] })
        setShake((s) => s + 1)
        toast('Não é um grupo. Tenta de novo!')
      }
      setSelected([])
    }, 350)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const toggle = (w: string) => {
    if (finished) return
    setSelected((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length < 4 ? [...s, w] : s))
  }

  const askHint = () => {
    const next = nextHint(puzzle, state.solved, state.hint)
    if (next.length === 0 || next === state.hint) {
      toast(state.solved.length >= 3 ? 'Sem dicas: só falta um grupo!' : 'Acabaram as dicas para este grupo.')
      return
    }
    setState({ ...state, hint: next, moves: [...state.moves, { kind: 'hint' }] })
  }

  const share = shareText(game.shareName, number, state.moves)

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['4', '5', '6', '7', '8', '9', '10+']}
      highlightBucket={finished ? (attempts > 9 ? '10+' : String(attempts)) : null}
      showAverage="Média de tentativas"
      help={
        <>
          <p>Forme <strong>4 grupos de 4 palavras</strong> que têm algo em comum.</p>
          <p>Toque numa palavra para selecionar; toque de novo para desmarcar. Ao marcar 4, o jogo confere sozinho.</p>
          <p>Acertou? A categoria aparece. Errou? Conta uma tentativa e você tenta de novo. As tentativas são <strong>ilimitadas</strong>.</p>
          <p>Cuidado com as pegadinhas: algumas palavras parecem caber em mais de um grupo! Cada cor indica a dificuldade:</p>
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold text-white">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="rounded-full px-2 py-0.5" style={{ background: GROUP_COLOR[n] }}>
                {['mais fácil', 'fácil', 'médio', 'difícil'][n - 1]}
              </span>
            ))}
          </div>
          <p>Travou? A <strong>dica</strong> destaca palavras do grupo mais fácil que falta.</p>
        </>
      }
      result={
        <>
          <p className="text-center">
            Você fez em <strong>{attempts} tentativas</strong>
            {hints ? ` e ${hints} ${hints === 1 ? 'dica' : 'dicas'}` : ''}.
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>
          Tentativas: <strong className="tabular-nums">{attempts}</strong> · Dicas: <strong className="tabular-nums">{hints}</strong>
        </span>
        {puzzle.status !== 'aprovado' && <span className="rounded-full bg-sun/50 px-2 py-0.5 text-xs font-semibold">em revisão</span>}
      </div>

      <LayoutGroup>
        <div className="space-y-2">
          <AnimatePresence>
            {solvedGroups.map((g) => (
              <motion.div
                key={g.nivel}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl px-4 py-3 text-center text-white"
                style={{ background: GROUP_COLOR[g.nivel] }}
              >
                <p className="font-heading text-lg font-semibold">{g.categoria}</p>
                <p className="text-sm font-semibold uppercase opacity-95">{g.palavras.join(' · ')}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.div
            key={shake}
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-4 gap-2"
          >
            {remaining.map((w) => {
              const isSel = selected.includes(w)
              const isHint = state.hint.includes(w)
              return (
                <motion.button
                  layout
                  key={w}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => toggle(w)}
                  whileTap={{ scale: 0.94 }}
                  className={`flex h-16 items-center justify-center rounded-xl border-2 px-1 text-center font-heading text-[clamp(0.7rem,3.3vw,1rem)] leading-tight font-semibold break-words uppercase transition-colors sm:h-20 ${
                    isSel ? 'border-ink bg-ink text-background' : isHint ? 'border-brand bg-accent' : 'border-ink/15 bg-card hover:border-ink/40'
                  }`}
                >
                  {w}
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      </LayoutGroup>

      {!finished ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="pop-outline" onClick={() => setOrder((o) => seededShuffle(o, Math.random()))}>
            <Shuffle aria-hidden /> Embaralhar
          </Button>
          <Button variant="pop-outline" onClick={() => setSelected([])} disabled={!selected.length}>
            <X aria-hidden /> Limpar
          </Button>
          <Button variant="pop-outline" onClick={askHint}>
            <Lightbulb aria-hidden /> Dica
          </Button>
        </div>
      ) : (
        <div className="mx-auto mt-5 w-full max-w-sm">
          <ShareButton text={share} />
        </div>
      )}
    </GameShell>
  )
}
