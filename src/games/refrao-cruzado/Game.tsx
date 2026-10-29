import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Eye, Headphones, ListChecks, Loader2, Pause, Play as PlayIcon } from 'lucide-react'
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
import { useL, useLang, useSettings } from '@/core/settings'
import {
  CLUE_DURATION_MS,
  CLUE_START_MS,
  HEIGHT,
  THEMES,
  WIDTH,
  buildCandidates,
  cellsOf,
  dailyTheme,
  formatTime,
  generateCrossword,
  isComplete,
  isCorrect,
  mainArtist,
  shareText,
  solutionMap,
  themeById,
  timeBucket,
  type PlacedWord,
  type TrackMeta,
} from './logic'

interface State {
  started: boolean
  elapsed: number
  letters: Record<string, string>
  revealed: string[]
  helps: number
  words: PlacedWord[] | null
  /** Tema usado na cruzadinha salva (pode cair no tema geral se o do dia não render uma grade). */
  theme: string | null
}

interface HolofoteArtist {
  name: string
  gender: string
  members: number
  country: string
  countryName: string
}

/** Quantas músicas do tema entram no sorteio de palavras de cada dia. */
const DAILY_POOL = 60
/** Abaixo disso, o tema não rende uma cruzadinha boa e o dia usa o tema geral. */
const MIN_THEME_SONGS = 8

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function useHelp(): ReactNode {
  const L = useL()
  return L(
    <>
      <p>É uma cruzadinha, mas toda palavra tem a ver com música! Cada pista tem um <strong>trecho de áudio</strong>: toque na pista (ou no ▶ ao lado dela) para tocar e pausar quantas vezes quiser. <Headphones className="inline size-4" /> ou ESPAÇO tocam a pista atual.</p>
      <p>As perguntas variam: nome da música, completar o título, quem canta, primeiro nome ou sobrenome, gênero, país, número de integrantes… Quando a resposta está em outro idioma, a pista avisa, por exemplo <strong>(em inglês)</strong>. Respostas sem acentos e sem espaços.</p>
      <p>Todo dia tem um <strong>tema</strong>: décadas, gêneros, divas do pop, bandas ou o especial de um artista.</p>
      <ul className="list-disc pl-5">
        <li>TAB ou ENTER: próxima palavra</li>
        <li>ESPAÇO: tocar o trecho da palavra atual</li>
        <li>Setas: andar pela grade</li>
      </ul>
      <p>Travou? Use <strong>Revelar</strong> ou <strong>Conferir</strong>. A cruzadinha confere sozinha quando você completa tudo. O cronômetro começa no botão Começar.</p>
      <p className="text-muted-foreground">As músicas são as mais tocadas da história do Spotify. Prévias cedidas pela Apple Music.</p>
    </>,
    <>
      <p>It's a crossword where every word is about music! Each clue has an <strong>audio snippet</strong>: tap the clue (or the ▶ next to it) to play and pause as often as you like. <Headphones className="inline size-4" /> or SPACE plays the current clue.</p>
      <p>Questions vary: song title, fill in the title, who sings it, first or last name, genre, country, number of band members… When the answer is in another language, the clue says so, for example <strong>(in Spanish)</strong>. Answers have no accents or spaces.</p>
      <p>Every day has a <strong>theme</strong>: decades, genres, pop divas, bands or a single-artist special.</p>
      <ul className="list-disc pl-5">
        <li>TAB or ENTER: next word</li>
        <li>SPACE: play the current word's snippet</li>
        <li>Arrows: move around the grid</li>
      </ul>
      <p>Stuck? Use <strong>Reveal</strong> or <strong>Check</strong>. The crossword checks itself once you fill everything in. The timer starts with the Start button.</p>
      <p className="text-muted-foreground">Songs are the most streamed in Spotify history. Previews provided by Apple Music.</p>
    </>,
  )
}

export default function RefraoCruzadoGame(ctx: GameContext) {
  const { date, number } = ctx
  const L = useL()
  const lang = useLang()
  const help = useHelp()
  const data = useData(() =>
    Promise.all([fetchData<{ songs: Song[] }>('musicas/songs.json'), fetchData<{ artists: HolofoteArtist[] }>('holofote/artists.json').catch(() => ({ artists: [] }))]),
  )
  const daily = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 4,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ started: false, elapsed: 0, letters: {}, revealed: [], helps: 0, words: null, theme: null }),
  })
  const { state, setState } = daily
  const generated = useMemo(() => {
    if (data.status !== 'ready' || state.words) return null
    const [{ songs }, { artists }] = data.data
    const byName = new Map(artists.map((a) => [fold(a.name), a]))
    const tracks: TrackMeta[] = songs
      .filter((s) => s.appleId !== null)
      .map((s) => ({
        artist: s.artist,
        song: s.title,
        trackId: String(s.appleId),
        year: s.year,
        genre: s.genre,
        titleLang: s.titleLang,
        info: byName.get(fold(mainArtist(s.artist))) ?? null,
      }))
    const attempt = (theme: (typeof THEMES)[number]) => {
      const themed = tracks.filter(theme.filter)
      if (themed.length < MIN_THEME_SONGS) return null
      const pool = seededShuffle(themed, `refrao:${date}:pool`).slice(0, DAILY_POOL)
      const words = generateCrossword(buildCandidates(pool, lang, theme), `refrao:${date}`)
      return words ? { words, theme: theme.id } : null
    }
    return attempt(dailyTheme(number)) ?? attempt(THEMES[0])
  }, [data, state.words, date, number, lang])

  useEffect(() => {
    if (generated) setState((s) => ({ ...s, words: generated.words, theme: generated.theme }))
  }, [generated, setState])

  const error =
    data.status === 'error'
      ? data.error
      : data.status === 'ready' && !state.words && !generated
        ? L('Não deu para montar a cruzadinha de hoje.', "Couldn't build today's crossword.")
        : null
  if (error || !state.words) {
    return (
      <GameShell {...ctx} status={daily.status} buckets={[]} help={help} result={null}>
        {error ? (
          <ErrorBox message={error} onRetry={data.status === 'error' ? data.retry : undefined} />
        ) : (
          <LoadingScreen label={L('Montando a cruzadinha…', 'Building the crossword…')} />
        )}
      </GameShell>
    )
  }
  const theme = themeById(state.theme ?? undefined)
  return <Board ctx={ctx} daily={daily} words={state.words} themeName={lang === 'en' ? theme.en : theme.pt} help={help} />
}

function Board({
  ctx,
  daily,
  words,
  themeName,
  help,
}: {
  ctx: GameContext
  daily: ReturnType<typeof useDailyGame<State>>
  words: PlacedWord[]
  themeName: string
  help: ReactNode
}) {
  const { game, number, date } = ctx
  const L = useL()
  const lang = useLang()
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

  // Qual pista está tocando (índice em `words`) e qual está carregando.
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null)

  /** Toca o trecho da pista; se ela já estiver tocando, pausa. */
  const toggleClue = useCallback(
    (i: number) => {
      if (playingIdx === i || loadingIdx === i) {
        player.current.stop(false)
        setPlayingIdx(null)
        setLoadingIdx(null)
        return
      }
      unlockAudio()
      setPlayingIdx(null)
      setLoadingIdx(i)
      player.current
        .play(Number(words[i].trackId), CLUE_START_MS, CLUE_DURATION_MS, settings.volume, () => setPlayingIdx((p) => (p === i ? null : p)))
        .then(() => {
          setLoadingIdx((l) => (l === i ? null : l))
          setPlayingIdx(i)
        })
        .catch((e: Error) => {
          setLoadingIdx(null)
          toast(e.message)
        })
    },
    [playingIdx, loadingIdx, words, settings.volume],
  )

  const playClue = useCallback((w: PlacedWord = word) => toggleClue(words.indexOf(w)), [toggleClue, word, words])

  const checkDone = (letters: Record<string, string>) => {
    if (!isComplete(words, letters)) return
    if (isCorrect(words, letters)) finish(true, timeBucket(state.elapsed), state.elapsed)
    else toast(L('Tem alguma letra errada. Use "Conferir" se precisar!', 'Some letter is wrong. Use "Check" if you need to!'))
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
    checkDone(letters)
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
    const keys = scope === 'letra' ? [`${cx},${cy}`] : scope === 'palavra' ? wordCells.map(([x, y]) => `${x},${y}`) : [...solution.keys()]
    const letters = { ...state.letters }
    for (const k of keys) letters[k] = solution.get(k)!
    const next = { ...state, letters, revealed: [...new Set([...state.revealed, ...keys])], helps: state.helps + 1 }
    setState(next)
    if (scope === 'tudo') finish(false, 'X', state.elapsed)
    else checkDone(letters)
  }

  const check = (scope: 'letra' | 'palavra' | 'tudo') => {
    const keys = scope === 'letra' ? [`${cx},${cy}`] : scope === 'palavra' ? wordCells.map(([x, y]) => `${x},${y}`) : [...solution.keys()]
    const bad = keys.filter((k) => state.letters[k] && state.letters[k] !== solution.get(k))
    setWrong(new Set(bad))
    setState({ ...state, helps: state.helps + 1 })
    toast(
      bad.length
        ? L(
            `${bad.length} ${bad.length === 1 ? 'letra errada marcada' : 'letras erradas marcadas'} em vermelho.`,
            `${bad.length} wrong ${bad.length === 1 ? 'letter' : 'letters'} marked in red.`,
          )
        : L('Tudo certo até aqui! ✨', 'All good so far! ✨'),
    )
  }

  const numbers = new Map(words.map((w) => [`${w.x},${w.y}`, w.number]))
  const activeKeys = new Set(wordCells.map(([x, y]) => `${x},${y}`))
  const shortDate = formatDateLong(date, lang, false)
  const share = shareText(game.shareName, number, shortDate, state.elapsed, state.helps, ctx.isArchive, lang, themeName)
  const helpsText = state.helps
    ? L(` com ${state.helps} ${state.helps === 1 ? 'ajuda' : 'ajudas'}`, ` with ${state.helps} ${state.helps === 1 ? 'hint' : 'hints'}`)
    : L(' sem ajuda', ' with no hints')
  const scopes = [
    ['letra', L('Letra', 'Letter')],
    ['palavra', L('Palavra', 'Word')],
    ['tudo', L('Cruzadinha toda', 'Whole crossword')],
  ] as const

  /** Clicar na linha seleciona a pista e toca o trecho; o botão colorido só toca/pausa. */
  const clueItem = (w: PlacedWord, i: number) => {
    const isPlaying = playingIdx === i
    const isLoading = loadingIdx === i
    const dirName = w.direction === 'across' ? L('horizontal', 'across') : L('vertical', 'down')
    return (
      <li key={i} className={`flex items-center gap-1 rounded-lg transition-colors ${i === active ? 'bg-accent' : 'hover:bg-muted'}`}>
        <button
          type="button"
          onClick={() => toggleClue(i)}
          aria-label={`${isPlaying || isLoading ? L('Pausar', 'Pause') : L('Tocar', 'Play')} ${L('o trecho da pista', 'the snippet for clue')} ${w.number} ${dirName}`}
          aria-pressed={isPlaying}
          className="grid size-8 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90"
          style={{ background: w.color }}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-[#1e1b2e]" aria-hidden />
          ) : isPlaying ? (
            <Pause className="size-4 text-[#1e1b2e]" aria-hidden />
          ) : (
            <PlayIcon className="size-4 translate-x-px text-[#1e1b2e]" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            if (i !== active) {
              setActive(i)
              setCursor(0)
            }
            toggleClue(i)
          }}
          aria-label={`${w.number} ${dirName}: ${w.clue} (${w.answer.length}). ${isPlaying ? L('Toque para pausar', 'Tap to pause') : L('Toque para ouvir', 'Tap to listen')}`}
          className={`flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left text-sm ${i === active ? 'font-semibold' : ''}`}
        >
          <strong className="w-5 shrink-0">{w.number}</strong>
          <span className="flex-1">
            {w.clue} <span className="text-muted-foreground">({w.answer.length})</span>
          </span>
          {isPlaying && <span className="shrink-0 animate-pulse text-xs" aria-hidden>🔊</span>}
        </button>
      </li>
    )
  }

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['≤2min', '≤5min', '≤10min', '10+min']}
      highlightBucket={status === 'won' ? timeBucket(state.elapsed) : null}
      showAverage={L('Tempo médio (s)', 'Average time (s)')}
      help={help}
      result={
        <>
          <p className="text-center">
            {status === 'won' ? L(`Completou em ${formatTime(state.elapsed)}`, `Finished in ${formatTime(state.elapsed)}`) : L('Revelada', 'Revealed')}
            {helpsText}.
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      {!state.started ? (
        <div className="mx-auto my-6 w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 text-center sticker">
          <p className="text-sm text-muted-foreground">{formatDateLong(date, lang)}</p>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{L('Tema do dia', "Today's theme")}</p>
          <h2 className="font-heading text-2xl font-semibold">🎼 {themeName}</h2>
          <p>{L(`${words.length} palavras, todas com pista de áudio.`, `${words.length} words, each with an audio clue.`)}</p>
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
            <PlayIcon aria-hidden /> {L('Começar', 'Start')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading text-xl tabular-nums" aria-label={L('Tempo', 'Time')}>
              ⏱ {formatTime(state.elapsed)}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">🎼 {themeName}</span>
            {!finished && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="pop-outline" size="sm">
                      <ListChecks aria-hidden /> {L('Conferir', 'Check')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {scopes.map(([k, label]) => (
                      <DropdownMenuItem key={k} onSelect={() => check(k)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="pop-outline" size="sm">
                      <Eye aria-hidden /> {L('Revelar', 'Reveal')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {scopes.map(([k, label]) => (
                      <DropdownMenuItem key={k} onSelect={() => reveal(k)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => playClue()}
            className="flex w-full items-center gap-2 rounded-2xl p-3 text-left text-ink"
            style={{ background: word.color }}
            aria-label={`${playingIdx === active || loadingIdx === active ? L('Pausar o trecho desta pista', 'Pause this clue') : L('Tocar o trecho desta pista', 'Play this clue')}: ${word.clue}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              {loadingIdx === active ? <Loader2 className="animate-spin" /> : playingIdx === active ? <Pause /> : <Headphones />}
            </span>
            <span className="font-heading text-lg leading-tight font-semibold text-[#1e1b2e]">
              {word.number} {word.direction === 'across' ? '→' : '↓'} {word.clue} ({word.answer.length})
            </span>
          </button>

          <div
            className="mx-auto grid w-full max-w-[560px] gap-0.5"
            style={{ gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))` }}
            role="grid"
            aria-label={L('Cruzadinha', 'Crossword')}
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
                    aria-label={`${L('Linha', 'Row')} ${y + 1}, ${L('coluna', 'column')} ${x + 1}${letter ? `: ${letter}` : ''}`}
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
              <p className="font-heading text-xl">
                {status === 'won' ? L(`Completou em ${formatTime(state.elapsed)}! 🎼`, `Finished in ${formatTime(state.elapsed)}! 🎼`) : L('Cruzadinha revelada.', 'Crossword revealed.')}
              </p>
              <ShareButton text={share} />
            </div>
          ) : (
            <VirtualKeyboard physical={false} onKey={setLetter} onEnter={() => nextWord()} onBackspace={backspace} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 font-heading font-semibold">{L('Horizontais →', 'Across →')}</h3>
              <ol className="space-y-0.5">{words.map((w, i) => (w.direction === 'across' ? clueItem(w, i) : null))}</ol>
            </section>
            <section>
              <h3 className="mb-1 font-heading font-semibold">{L('Verticais ↓', 'Down ↓')}</h3>
              <ol className="space-y-0.5">{words.map((w, i) => (w.direction === 'down' ? clueItem(w, i) : null))}</ol>
            </section>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {L('Prévias cedidas pela Apple Music · tema', 'Previews provided by Apple Music · theme')} {themeName}
          </p>
        </div>
      )}
    </GameShell>
  )
}
