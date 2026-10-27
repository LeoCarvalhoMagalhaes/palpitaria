import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Eye, Headphones, ListChecks, Play as PlayIcon } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { VirtualKeyboard } from '@/components/VirtualKeyboard'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { type Song } from '@/config/music'
import { fetchData, useData } from '@/core/data'
import { formatDateLong, seededShuffle } from '@/core/daily'
import { useDailyGame } from '@/core/hooks'
import { ClipPlayer, loadClip, unlockAudio } from '@/core/preview'
import { useSettings } from '@/core/settings'
import {
  CLUE_DURATION_MS,
  CLUE_START_MS,
  HEIGHT,
  WIDTH,
  buildCandidates,
  cellsOf,
  formatTime,
  generateCrossword,
  isComplete,
  isCorrect,
  shareText,
  solutionMap,
  timeBucket,
  type PlacedWord,
} from './logic'

interface State {
  started: boolean
  elapsed: number
  letters: Record<string, string>
  revealed: string[]
  helps: number
  words: PlacedWord[] | null
}

const HELP = (
  <>
    <p>É uma cruzadinha, mas toda palavra tem a ver com música! Cada pista tem um <strong>trecho de áudio</strong>: aperte <Headphones className="inline size-4" /> ou ESPAÇO para ouvir de novo quantas vezes quiser.</p>
    <p>As respostas são nomes de artistas ou de músicas, sem acentos e sem espaços.</p>
    <ul className="list-disc pl-5">
      <li>TAB ou ENTER: próxima palavra</li>
      <li>ESPAÇO: tocar o trecho da palavra atual</li>
      <li>Setas: andar pela grade</li>
    </ul>
    <p>Travou? Use <strong>Revelar</strong> ou <strong>Conferir</strong>. A cruzadinha confere sozinha quando você completa tudo. O cronômetro começa no botão Começar.</p>
    <p className="text-muted-foreground">As músicas são as mais tocadas da história do Spotify. Prévias cedidas pela Apple Music.</p>
  </>
)

const THEME = 'As mais tocadas do Spotify'
/** Quantas músicas do top entram no sorteio de palavras de cada dia. */
const DAILY_POOL = 60

export default function RefraoCruzadoGame(ctx: GameContext) {
  const { game, date } = ctx
  const data = useData(() => fetchData<{ songs: Song[] }>('musicas/songs.json'))
  const daily = useDailyGame<State>({
    slug: game.slug,
    version: 3,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ started: false, elapsed: 0, letters: {}, revealed: [], helps: 0, words: null }),
  })
  const { state, setState } = daily
  const generated = useMemo(() => {
    if (data.status !== 'ready' || state.words) return null
    const withPreview = data.data.songs.filter((s) => s.appleId !== null)
    const pool = seededShuffle(withPreview, `refrao:${date}:pool`).slice(0, DAILY_POOL)
    return generateCrossword(buildCandidates(pool.map((s) => ({ artist: s.artist, song: s.title, trackId: String(s.appleId) }))), `refrao:${date}`)
  }, [data, state.words, date])

  useEffect(() => {
    if (generated) setState((s) => ({ ...s, words: generated }))
  }, [generated, setState])

  const error = data.status === 'error' ? data.error : data.status === 'ready' && !state.words && !generated ? 'Não deu para montar a cruzadinha de hoje.' : null
  if (error || !state.words) {
    return (
      <GameShell {...ctx} status={daily.status} buckets={[]} help={HELP} result={null}>
        {error ? <ErrorBox message={error} onRetry={data.status === 'error' ? data.retry : undefined} /> : <LoadingScreen label="Montando a cruzadinha…" />}
      </GameShell>
    )
  }
  return <Board ctx={ctx} daily={daily} words={state.words} categoryName={THEME} />
}

function Board({
  ctx,
  daily,
  words,
  categoryName,
}: {
  ctx: GameContext
  daily: ReturnType<typeof useDailyGame<State>>
  words: PlacedWord[]
  categoryName: string
}) {
  const { game, number, date } = ctx
  const { state, setState, status, finish } = daily
  const solution = useMemo(() => solutionMap(words), [words])
  const [active, setActive] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const { settings } = useSettings()
  const player = useRef(new ClipPlayer())
  const finished = status === 'won' || status === 'lost'

  const word = words[active]
  const wordCells = cellsOf(word)
  const [cx, cy] = wordCells[Math.min(cursor, wordCells.length - 1)]

  // Cronômetro: só corre com o jogo começado, a aba visível e o desafio em aberto.
  useEffect(() => {
    if (!state.started || finished) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setState((s) => ({ ...s, elapsed: s.elapsed + 1 }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [state.started, finished, setState])

  // Pré-carrega o trecho da pista ativa para tocar sem espera.
  useEffect(() => {
    loadClip(Number(word.trackId)).catch(() => {})
  }, [word.trackId])

  useEffect(() => {
    const p = player.current
    return () => p.stop(false)
  }, [])

  const playClue = useCallback(
    (w: PlacedWord = word) => {
      unlockAudio()
      player.current.play(Number(w.trackId), CLUE_START_MS, CLUE_DURATION_MS, settings.volume).catch((e: Error) => toast(e.message))
    },
    [word, settings.volume],
  )

  const checkDone = (letters: Record<string, string>, helps: number) => {
    if (!isComplete(words, letters)) return
    if (isCorrect(words, letters)) finish(true, timeBucket(state.elapsed), state.elapsed)
    else toast('Tem alguma letra errada. Use "Conferir" se precisar!')
    void helps
  }

  const setLetter = (letter: string) => {
    if (finished || !state.started) return
    const key = `${cx},${cy}`
    if (state.revealed.includes(key)) {
      setCursor((c) => Math.min(c + 1, wordCells.length - 1))
      return
    }
    const letters = { ...state.letters, [key]: letter.toUpperCase() }
    setState({ ...state, letters })
    setWrong((w) => {
      const n = new Set(w)
      n.delete(key)
      return n
    })
    setCursor((c) => Math.min(c + 1, wordCells.length - 1))
    checkDone(letters, state.helps)
  }

  const backspace = () => {
    if (finished || !state.started) return
    const key = `${cx},${cy}`
    if (state.letters[key] && !state.revealed.includes(key)) {
      const letters = { ...state.letters }
      delete letters[key]
      setState({ ...state, letters })
    } else setCursor((c) => Math.max(c - 1, 0))
  }

  const selectCell = (x: number, y: number) => {
    const containing = words.map((w, i) => ({ w, i })).filter(({ w }) => cellsOf(w).some(([a, b]) => a === x && b === y))
    if (!containing.length) return
    const already = containing.findIndex(({ i }) => i === active)
    const pick = already >= 0 && containing.length > 1 && cx === x && cy === y ? containing[(already + 1) % containing.length] : containing[Math.max(already, 0)]
    setActive(pick.i)
    setCursor(cellsOf(pick.w).findIndex(([a, b]) => a === x && b === y))
  }

  const nextWord = (dir = 1) => {
    const n = (active + dir + words.length) % words.length
    setActive(n)
    setCursor(0)
  }

  const move = (dx: number, dy: number) => {
    let x = cx + dx
    let y = cy + dy
    while (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
      if (solution.has(`${x},${y}`)) return selectCell(x, y)
      x += dx
      y += dy
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [role="dialog"], [role="menu"]')) return
      if (!state.started) return
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        nextWord(e.shiftKey ? -1 : 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        playClue()
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]!
        move(d[0], d[1])
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        backspace()
      } else if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
        setLetter(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const reveal = (scope: 'letra' | 'palavra' | 'tudo') => {
    const keys =
      scope === 'letra' ? [`${cx},${cy}`] : scope === 'palavra' ? wordCells.map(([x, y]) => `${x},${y}`) : [...solution.keys()]
    const letters = { ...state.letters }
    for (const k of keys) letters[k] = solution.get(k)!
    const next = { ...state, letters, revealed: [...new Set([...state.revealed, ...keys])], helps: state.helps + 1 }
    setState(next)
    if (scope === 'tudo') finish(false, 'X', state.elapsed)
    else checkDone(letters, next.helps)
  }

  const check = (scope: 'letra' | 'palavra' | 'tudo') => {
    const keys =
      scope === 'letra' ? [`${cx},${cy}`] : scope === 'palavra' ? wordCells.map(([x, y]) => `${x},${y}`) : [...solution.keys()]
    const bad = keys.filter((k) => state.letters[k] && state.letters[k] !== solution.get(k))
    setWrong(new Set(bad))
    setState({ ...state, helps: state.helps + 1 })
    toast(bad.length ? `${bad.length} ${bad.length === 1 ? 'letra errada' : 'letras erradas'} marcada${bad.length === 1 ? '' : 's'} em vermelho.` : 'Tudo certo até aqui! ✨')
  }

  const numbers = new Map(words.map((w) => [`${w.x},${w.y}`, w.number]))
  const activeKeys = new Set(wordCells.map(([x, y]) => `${x},${y}`))
  const share = shareText(game.shareName, number, formatDateLong(date).replace(/ de \d{4}$/, ''), state.elapsed, state.helps, ctx.isArchive)

  const ClueItem = ({ w, i }: { w: PlacedWord; i: number }) => (
    <li>
      <button
        type="button"
        onClick={() => {
          setActive(i)
          setCursor(0)
        }}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${i === active ? 'bg-accent font-semibold' : 'hover:bg-muted'}`}
      >
        <span className="size-3 shrink-0 rounded-full" style={{ background: w.color }} aria-hidden />
        <strong className="w-5 shrink-0">{w.number}</strong>
        <span className="flex-1">
          {w.clue} <span className="text-muted-foreground">({w.answer.length})</span>
        </span>
      </button>
    </li>
  )

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['≤2min', '≤5min', '≤10min', '10+min']}
      highlightBucket={status === 'won' ? timeBucket(state.elapsed) : null}
      showAverage="Tempo médio (s)"
      help={HELP}
      result={
        <>
          <p className="text-center">
            {status === 'won' ? `Completou em ${formatTime(state.elapsed)}` : 'Revelada'}
            {state.helps ? ` com ${state.helps} ${state.helps === 1 ? 'ajuda' : 'ajudas'}` : ' sem ajuda'}.
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      {!state.started ? (
        <div className="mx-auto my-6 w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 text-center sticker">
          <p className="text-sm text-muted-foreground">{formatDateLong(date)}</p>
          <h2 className="font-heading text-2xl font-semibold">Tema: {categoryName}</h2>
          <p>{words.length} palavras, todas com pista de áudio.</p>
          <Button
            variant="pop"
            size="xl"
            className="w-full"
            onClick={() => {
              setState({ ...state, started: true })
              unlockAudio()
              window.setTimeout(() => playClue(words[0]), 300)
            }}
          >
            <PlayIcon aria-hidden /> Começar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading text-xl tabular-nums" aria-label="Tempo">
              ⏱ {formatTime(state.elapsed)}
            </span>
            {!finished && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="pop-outline" size="sm">
                      <ListChecks aria-hidden /> Conferir
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => check('letra')}>Letra</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => check('palavra')}>Palavra</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => check('tudo')}>Cruzadinha toda</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="pop-outline" size="sm">
                      <Eye aria-hidden /> Revelar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => reveal('letra')}>Letra</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => reveal('palavra')}>Palavra</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => reveal('tudo')}>Cruzadinha toda</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl p-3 text-ink" style={{ background: word.color }}>
            <Button variant="secondary" size="icon-lg" onClick={() => playClue()} aria-label="Tocar o trecho desta pista" className="shrink-0 rounded-full">
              <Headphones />
            </Button>
            <p className="font-heading text-lg leading-tight font-semibold text-[#1e1b2e]">
              {word.number} {word.direction === 'across' ? '→' : '↓'} {word.clue} ({word.answer.length})
            </p>
          </div>

          <div
            className="mx-auto grid w-full max-w-[560px] gap-0.5"
            style={{ gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Cruzadinha"
          >
            {Array.from({ length: HEIGHT }).flatMap((_, y) =>
              Array.from({ length: WIDTH }).map((__, x) => {
                const k = `${x},${y}`
                if (!solution.has(k)) return <div key={k} className="aspect-square" aria-hidden />
                const isCursor = x === cx && y === cy
                const inWord = activeKeys.has(k)
                const letter = state.letters[k] ?? ''
                const isRevealed = state.revealed.includes(k)
                const isWrong = wrong.has(k)
                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    onClick={() => selectCell(x, y)}
                    aria-label={`Linha ${y + 1}, coluna ${x + 1}${letter ? `: ${letter}` : ''}`}
                    className={`relative grid aspect-square place-items-center rounded-[4px] border font-heading text-[clamp(0.8rem,4vw,1.4rem)] font-bold uppercase ${
                      isCursor ? 'border-2 border-ink' : 'border-ink/30'
                    } ${isWrong ? 'text-far' : isRevealed ? 'text-brand-2' : ''}`}
                    style={{ background: inWord ? `${word.color}66` : 'var(--card)' }}
                  >
                    {numbers.has(k) && <span className="absolute top-0 left-0.5 text-[9px] leading-none font-semibold">{numbers.get(k)}</span>}
                    {letter}
                  </button>
                )
              }),
            )}
          </div>

          {finished ? (
            <div className="mx-auto max-w-sm space-y-2 text-center">
              <p className="font-heading text-xl">{status === 'won' ? `Completou em ${formatTime(state.elapsed)}! 🎼` : 'Cruzadinha revelada.'}</p>
              <ShareButton text={share} />
            </div>
          ) : (
            <VirtualKeyboard physical={false} onKey={setLetter} onEnter={() => nextWord()} onBackspace={backspace} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 font-heading font-semibold">Horizontais →</h3>
              <ol className="space-y-0.5">
                {words.map((w, i) => (w.direction === 'across' ? <ClueItem key={i} w={w} i={i} /> : null))}
              </ol>
            </section>
            <section>
              <h3 className="mb-1 font-heading font-semibold">Verticais ↓</h3>
              <ol className="space-y-0.5">
                {words.map((w, i) => (w.direction === 'down' ? <ClueItem key={i} w={w} i={i} /> : null))}
              </ol>
            </section>
          </div>
          <p className="text-center text-xs text-muted-foreground">Prévias cedidas pela Apple Music · tema {categoryName}</p>
        </div>
      )}
    </GameShell>
  )
}
