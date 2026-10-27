import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Pause, Play as PlayIcon, SkipForward } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { MUSIC_CATEGORIES, songLabel, type Song } from '@/config/music'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { embedUrl, trackUrl } from '@/core/spotify'
import { HiddenSpotifyPlayer, type SnippetControls } from '@/components/HiddenSpotifyPlayer'
import {
  MAX_TRIES,
  SNIPPETS_MS,
  availableCategories,
  dailySong,
  emojiRow,
  emptyCategory,
  formatSeconds,
  isFinished,
  isSolved,
  shareText,
  snippetFor,
  winThreshold,
  type CategoryState,
} from './logic'

type State = Record<string, CategoryState>

export default function TocaAiGame(ctx: GameContext) {
  const data = useData(() => fetchData<{ songs: Song[] }>('musicas/songs.json'))
  if (data.status === 'loading') return <LoadingScreen label="Afinando os instrumentos…" />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} songs={data.data.songs} />
}

function Play({ ctx, songs }: { ctx: GameContext; songs: Song[] }) {
  const { game, date, number } = ctx
  const categories = useMemo(() => availableCategories(MUSIC_CATEGORIES, songs), [songs])
  const answers = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, dailySong(c, songs, number)])), [categories, songs, number])
  const { state, setState, finish, status } = useDailyGame<State>({
    slug: game.slug,
    version: 2,
    date,
    isArchive: ctx.isArchive,
    init: () => Object.fromEntries(categories.map((c) => [c.id, emptyCategory()])),
  })
  const [active, setActive] = useState(() => categories.find((c) => !isFinished(state[c.id] ?? emptyCategory()))?.id ?? categories[0].id)
  const [playing, setPlaying] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const playerRef = useRef<SnippetControls>(null)

  const cat = state[active] ?? emptyCategory()
  const catDone = isFinished(cat)
  const answer = answers[active]

  const options: Option[] = useMemo(() => songs.map((s) => ({ id: s.id, label: songLabel(s), keys: [s.title, s.artist] })), [songs])

  const play = async () => {
    const p = playerRef.current
    if (!p) return
    if (playing) {
      p.stop()
      return
    }
    setPlaying(true)
    setPlayerError(null)
    try {
      await p.play(answer.id, catDone ? 30000 : snippetFor(cat), () => setPlaying(false))
    } catch (e) {
      setPlaying(false)
      setPlayerError((e as Error).message)
    }
  }

  const record = (next: CategoryState) => {
    playerRef.current?.stop(false)
    setPlaying(false)
    const updated: State = { ...state, [active]: next }
    setState(updated)
    if (categories.every((c) => isFinished(updated[c.id] ?? emptyCategory()))) {
      const solved = categories.filter((c) => isSolved(updated[c.id])).length
      finish(solved >= winThreshold(categories.length), String(solved), solved)
    } else if (isFinished(next)) {
      const nextCat = categories.find((c) => c.id !== active && !isFinished(updated[c.id] ?? emptyCategory()))
      if (nextCat) window.setTimeout(() => toast(`Próxima categoria: ${nextCat.name}`), 600)
    }
  }

  const guess = (opt: Option) => {
    if (catDone) return
    const correct = opt.id === answer.id
    record({ attempts: [...cat.attempts, { kind: 'guess', id: opt.id, label: opt.label, correct }] })
    if (!correct) toast('Não é essa! O trecho ficou maior.')
  }

  const skip = () => {
    if (catDone) return
    record({ attempts: [...cat.attempts, { kind: 'skip' }] })
  }

  const share = shareText(game.shareName, number, categories, state)
  const solvedCount = categories.filter((c) => isSolved(state[c.id] ?? emptyCategory())).length
  const total = SNIPPETS_MS[SNIPPETS_MS.length - 1]
  const unlocked = catDone ? total : snippetFor(cat)
  const excluded = useMemo(
    () => new Set(cat.attempts.flatMap((a) => (a.kind === 'guess' ? [a.id] : []))),
    [cat.attempts],
  )
  const buckets = Array.from({ length: categories.length + 1 }, (_, i) => String(i))

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={buckets}
      highlightBucket={status === 'won' || status === 'lost' ? String(solvedCount) : null}
      bucketLabel={(b) => `${b}/${categories.length}`}
      help={
        <>
          <p>Ouça um <strong>trechinho</strong> e adivinhe a música. Errou ou pulou? O trecho aumenta: {SNIPPETS_MS.map(formatSeconds).join(' → ')}.</p>
          <p>As músicas são as <strong>{songs.length} mais tocadas da história do Spotify</strong>. São {categories.length} categorias por dia ({categories.map((c) => c.name).join(', ')}), com {MAX_TRIES} tentativas cada. Acertando {winThreshold(categories.length)} ou mais, o dia conta como vitória.</p>
          <p>Digite o nome da música ou do artista e escolha na lista.</p>
          <p className="text-muted-foreground">O áudio toca pelo player oficial do Spotify: sem login, prévia de 30 s; com login no Spotify neste navegador, a faixa completa.</p>
        </>
      }
      result={
        <>
          <p className="text-center">
            Você acertou <strong>{solvedCount} de {categories.length}</strong> categorias.
          </p>
          <ul className="space-y-1 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>{c.name}</span>
                <span className="truncate text-right text-muted-foreground">{songLabel(answers[c.id])}</span>
              </li>
            ))}
          </ul>
          <ShareButton text={share} />
        </>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Categorias">
        {categories.map((c) => {
          const s = state[c.id] ?? emptyCategory()
          const fin = isFinished(s)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                playerRef.current?.stop(false)
                setPlaying(false)
                setActive(c.id)
              }}
              aria-pressed={active === c.id}
              className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${active === c.id ? 'border-ink bg-ink text-background' : 'border-ink/20'}`}
            >
              {c.name} {fin ? (isSolved(s) ? '✓' : '✗') : ''}
            </button>
          )
        })}
      </nav>

      {playerError && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-sm text-destructive" role="alert">{playerError}</p>}

      <div className="mx-auto w-full max-w-lg space-y-4">
        <HiddenSpotifyPlayer ref={playerRef} label={catDone ? 'Player do Spotify' : 'A música está escondida aqui 🤫'} />

        <div className="flex h-4 overflow-hidden rounded-full border-2 border-ink/20 bg-muted" aria-label={`Trecho liberado: ${formatSeconds(unlocked)}`}>
          {SNIPPETS_MS.map((ms, i) => {
            const prev = i === 0 ? 0 : SNIPPETS_MS[i - 1]
            const width = Math.max(4, ((ms - prev) / total) * 100)
            return <span key={ms} style={{ width: `${width}%` }} className={`border-r border-background ${ms <= unlocked ? 'bg-brand' : ''}`} />
          })}
        </div>

        <div className="flex items-center justify-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => void play()}
            className="grid size-24 place-items-center rounded-full bg-primary text-primary-foreground sticker sticker-press disabled:opacity-60"
            aria-label={playing ? 'Parar' : `Ouvir ${formatSeconds(catDone ? 30000 : snippetFor(cat))}`}
          >
            {playing ? (
              <Pause className="size-10" />
            ) : (
              <PlayIcon className="size-10 translate-x-0.5" />
            )}
          </motion.button>
          {!catDone && (
            <Button variant="pop-outline" onClick={skip}>
              <SkipForward aria-hidden /> Pular
            </Button>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {catDone
              ? 'Toque para ouvir mais da música.'
              : `Tentativa ${cat.attempts.length + 1} de ${MAX_TRIES} · trecho de ${formatSeconds(snippetFor(cat))}`}
        </p>

        {!catDone && (
          <Autocomplete
            options={options}
            excludeIds={excluded}
            label="Nome da música"
            placeholder="Música ou artista…"
            onSelect={guess}
            onInvalid={(text, s) => toast.error(s ? `Não achei "${text}". Seria ${s.label}?` : 'Escolha uma música da lista.')}
          />
        )}

        <ol className="space-y-1.5">
          {Array.from({ length: MAX_TRIES }, (_, i) => {
            const a = cat.attempts[i]
            const cls = !a ? 'border-dashed border-ink/15' : a.kind === 'skip' ? 'bg-muted border-ink/10' : a.correct ? 'tile-hit' : 'tile-far'
            return (
              <li key={i} className={`flex h-11 items-center rounded-xl border-2 px-3 text-sm font-semibold ${cls}`}>
                {!a ? '' : a.kind === 'skip' ? 'Pulou' : a.label}
              </li>
            )
          })}
        </ol>

        {catDone && (
          <div className="space-y-2 rounded-2xl bg-card p-3 sticker">
            <p className="font-heading text-lg">
              {isSolved(cat) ? 'Acertou! 🎉' : 'Era essa:'} {songLabel(answer)}
            </p>
            <p className="text-sm">{emojiRow(cat)}</p>
            <iframe
              title={`Spotify: ${songLabel(answer)}`}
              className="h-20 w-full rounded-xl"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              src={embedUrl(answer.id)}
            />
            <a className="text-xs text-muted-foreground underline" href={trackUrl(answer.id)} target="_blank" rel="noopener noreferrer">
              Abrir no Spotify
            </a>
          </div>
        )}

        {(status === 'won' || status === 'lost') && <ShareButton text={share} />}
      </div>
    </GameShell>
  )
}
