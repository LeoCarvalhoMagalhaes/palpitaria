import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Flag, Lightbulb } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { MAX_BOARD, barWidth, dayFile, decodeRanks, fold, heat, hintCost, hintTargetRank, metrics, shareText, type Entry } from './logic'

interface Vocab {
  days: number
  words: string[]
}

interface Day {
  answer: string
  ranks: Uint16Array
}

interface State {
  entries: Entry[]
}

const HEAT_CLASS = { hot: 'bg-hit', warm: 'bg-near', cold: 'bg-far' }

function Row({ e, total, highlight }: { e: Entry; total: number; highlight?: boolean }) {
  return (
    <li className={`relative overflow-hidden rounded-xl border-2 ${highlight ? 'border-ink' : 'border-ink/10'} bg-card`}>
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${barWidth(e.rank, total)}%` }}
        transition={{ duration: 0.5 }}
        className={`absolute inset-y-0 left-0 opacity-30 ${HEAT_CLASS[heat(e.rank)]}`}
        aria-hidden
      />
      <span className="relative flex items-center justify-between px-3 py-2">
        <span className="font-heading text-lg font-semibold">
          {e.word} {e.isHint && <span className="text-xs font-normal text-muted-foreground">(dica)</span>}
        </span>
        <span className="font-heading text-lg tabular-nums">{e.rank === 1 ? '🎯' : e.rank.toLocaleString('pt-BR')}</span>
      </span>
    </li>
  )
}

export default function RastroGame(ctx: GameContext) {
  const data = useData(async () => {
    const vocab = await fetchData<Vocab>('rastro/vocab.json')
    const day = await fetchData<{ answer: string; ranks: string }>(dayFile(ctx.number, vocab.days))
    return { vocab, day: { answer: day.answer, ranks: decodeRanks(day.ranks) } as Day }
  }, [ctx.number])
  if (data.status === 'loading') return <LoadingScreen label="Farejando o rastro…" />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} vocab={data.data.vocab} day={data.data.day} />
}

function Play({ ctx, vocab, day }: { ctx: GameContext; vocab: Vocab; day: Day }) {
  const { game, date, number } = ctx
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ entries: [] }),
  })
  const [input, setInput] = useState('')
  const [last, setLast] = useState<Entry | null>(null)
  const index = useMemo(() => {
    const m = new Map<string, number>()
    vocab.words.forEach((w, i) => {
      const k = fold(w)
      if (!m.has(k) || w !== k) m.set(k, i)
    })
    return m
  }, [vocab.words])
  const byRank = useMemo(() => {
    const arr: number[] = []
    day.ranks.forEach((r, i) => (arr[r] = i))
    return arr
  }, [day.ranks])

  const finished = status === 'won' || status === 'lost'
  const won = status === 'won'
  const { guessCount, hintCount } = metrics(state.entries)
  const sorted = [...state.entries].sort((a, b) => a.rank - b.rank)
  const total = vocab.words.length

  const add = (entry: Entry) => {
    const entries = [...state.entries, entry].slice(-MAX_BOARD)
    setState({ entries })
    setLast(entry)
    if (entry.rank === 1) {
      const m = metrics(entries)
      finish(true, m.guessCount <= 10 ? '1-10' : m.guessCount <= 25 ? '11-25' : m.guessCount <= 50 ? '26-50' : m.guessCount <= 100 ? '51-100' : '100+', m.guessCount)
    }
  }

  const submit = () => {
    const word = fold(input)
    setInput('')
    if (!word || finished) return
    const i = index.get(word)
    if (i === undefined) {
      toast('Não conheço essa palavra. Tente outra!')
      return
    }
    if (state.entries.some((e) => fold(e.word) === word)) {
      toast('Esse você já tentou 😉')
      setLast(state.entries.find((e) => fold(e.word) === word) ?? null)
      return
    }
    add({ word: vocab.words[i], rank: day.ranks[i], isHint: false })
  }

  const hint = () => {
    if (finished) return
    let target = hintTargetRank(state.entries)
    // Pula palavras já no quadro.
    while (target > 2 && state.entries.some((e) => e.rank === target)) target -= 1
    const i = byRank[target]
    if (i === undefined) return
    add({ word: vocab.words[i], rank: target, isHint: true })
    toast(`Dica: "${vocab.words[i]}" (custou ${hintCost(target)} tentativas)`)
  }

  const giveUp = () => {
    if (finished) return
    if (!window.confirm('Desistir e ver a palavra de hoje?')) return
    finish(false, 'X', guessCount)
  }

  const share = shareText(game.shareName, number, state.entries, won)

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['1-10', '11-25', '26-50', '51-100', '100+', 'X']}
      highlightBucket={null}
      showAverage="Média de tentativas"
      help={
        <>
          <p>Descubra a <strong>palavra secreta</strong>. Tentativas ilimitadas!</p>
          <p>Cada palavra que você chuta ganha um <strong>número</strong>: a posição dela numa lista de todas as palavras, ordenadas pela proximidade de <strong>sentido</strong> com a palavra secreta. A palavra secreta é a número 1.</p>
          <p>Ex.: se a secreta for "praia", "areia" e "mar" ficam bem perto; "computador" fica lá longe.</p>
          <p>A <strong>dica</strong> mostra uma palavra mais perto que o seu melhor palpite, mas custa tentativas: 7 se ela ainda estiver longe (posição 1.000 ou mais), 5 se estiver no meio (160 a 999) e 3 se estiver bem perto.</p>
          <p className="text-muted-foreground">A proximidade foi calculada por um modelo de linguagem (LaBSE) e às vezes surpreende. Faz parte da graça!</p>
        </>
      }
      result={
        <>
          <p className="text-center text-base">
            A palavra era <strong className="font-heading text-xl">{day.answer}</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <div className="mb-2 flex justify-between text-sm">
        <span>
          Tentativas: <strong className="tabular-nums">{guessCount}</strong> · Dicas: <strong className="tabular-nums">{hintCount}</strong>
        </span>
      </div>

      {!finished && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma palavra…"
            aria-label="Seu palpite"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 flex-1 rounded-xl border-2 border-ink bg-card px-4 text-lg font-semibold outline-none focus:border-brand-2"
          />
          <Button type="submit" variant="pop" size="xl">
            Chutar
          </Button>
        </form>
      )}

      {finished && (
        <div className="mx-auto w-full max-w-sm space-y-2 text-center">
          <p className="font-heading text-xl">{won ? `Achou! Era "${day.answer}" 🧭` : `Era "${day.answer}".`}</p>
          <ShareButton text={share} />
        </div>
      )}

      <div className="mt-3" aria-live="polite">
        {last && (
          <ul>
            <Row e={last} total={total} highlight />
          </ul>
        )}
      </div>

      {state.entries.length === 0 ? (
        <p className="mt-4 text-center text-muted-foreground">Comece chutando palavras para ver seu progresso!</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {sorted.map((e) => (
              <Row key={e.word} e={e} total={total} />
            ))}
          </AnimatePresence>
        </ol>
      )}

      {!finished && (
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="pop-outline" onClick={hint}>
            <Lightbulb aria-hidden /> Dica
          </Button>
          <Button variant="ghost" onClick={giveUp}>
            <Flag aria-hidden /> Desistir
          </Button>
        </div>
      )}
    </GameShell>
  )
}
