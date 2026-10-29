import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Pause, Play as PlayIcon, SkipForward, Volume2 } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { MUSIC_CATEGORIES, songLabel, type Song } from '@/config/music'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang, useSettings } from '@/core/settings'
import { ClipPlayer, getPreview, loadClip, unlockAudio, type PreviewInfo } from '@/core/preview'
import { trackUrl } from '@/core/spotify'
import {
  MAX_TRIES,
  SNIPPETS_MS,
  availableCategories,
  dailySong,
  emojiRow,
  emptyCategory,
  formatSeconds,
  isFinished,
  isSameArtist,
  isSolved,
  shareText,
  snippetFor,
  winThreshold,
  type CategoryState,
} from './logic'

type State = Record<string, CategoryState>

const FULL_PREVIEW_MS = 30000

export default function TocaAiGame(ctx: GameContext) {
  const L = useL()
  const data = useData(() => fetchData<{ songs: Song[] }>('musicas/songs.json'))
  if (data.status === 'loading') return <LoadingScreen label={L('Afinando os instrumentos…', 'Tuning the instruments…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} songs={data.data.songs} />
}

/** Barra dos trechos: mostra o que já foi liberado e enche em tempo real enquanto toca. */
function SnippetBar({ unlocked, playingFrom }: { unlocked: number; playingFrom: { at: number; ms: number } | null }) {
  const L = useL()
  const lang = useLang()
  const total = SNIPPETS_MS[SNIPPETS_MS.length - 1]
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!playingFrom) {
      setProgress(0)
      return
    }
    let raf = 0
    const tick = () => {
      const elapsed = Math.min(performance.now() - playingFrom.at, playingFrom.ms)
      setProgress(Math.min(elapsed, total))
      if (elapsed < playingFrom.ms) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playingFrom, total])
  // Escala que dá espaço visível aos trechos curtos (0,13 s e 0,53 s).
  const pos = (ms: number) => (Math.sqrt(ms / total) * 100).toFixed(2)
  return (
    <div className="relative h-5 overflow-hidden rounded-full border-2 border-ink/20 bg-muted" aria-label={`${L('Trecho liberado', 'Unlocked snippet')}: ${formatSeconds(unlocked, lang)}`}>
      <div className="absolute inset-y-0 left-0 bg-brand/35" style={{ width: `${pos(unlocked)}%` }} />
      <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${pos(progress)}%` }} />
      {SNIPPETS_MS.slice(0, -1).map((ms) => (
        <span key={ms} className="absolute inset-y-0 w-0.5 bg-background" style={{ left: `${pos(ms)}%` }} aria-hidden />
      ))}
    </div>
  )
}

function Play({ ctx, songs }: { ctx: GameContext; songs: Song[] }) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const sec = (ms: number) => formatSeconds(ms, lang)
  const { settings, update } = useSettings()
  const categories = useMemo(
    () => availableCategories(MUSIC_CATEGORIES, songs).map((c) => (lang === 'en' ? { ...c, name: c.nameEn } : c)),
    [songs, lang],
  )
  const answers = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, dailySong(c, songs, number)])), [categories, songs, number])
  const { state, setState, finish, status } = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 3,
    date,
    isArchive: ctx.isArchive,
    init: () => Object.fromEntries(categories.map((c) => [c.id, emptyCategory()])),
  })
  const [active, setActive] = useState(() => categories.find((c) => !isFinished(state[c.id] ?? emptyCategory()))?.id ?? categories[0].id)
  const [playingFrom, setPlayingFrom] = useState<{ at: number; ms: number } | null>(null)
  const [loadingClip, setLoadingClip] = useState(false)
  const [clipError, setClipError] = useState<string | null>(null)
  const [info, setInfo] = useState<PreviewInfo | null>(null)
  const player = useRef(new ClipPlayer())

  const cat = state[active] ?? emptyCategory()
  const catDone = isFinished(cat)
  const answer = answers[active]

  // Pré-carrega a prévia da categoria aberta para o primeiro clique já tocar.
  useEffect(() => {
    setClipError(null)
    setInfo(null)
    let alive = true
    loadClip(answer.appleId!).catch((e: Error) => alive && setClipError(e.message))
    getPreview(answer.appleId!)
      .then((i) => alive && setInfo(i))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [answer.appleId])

  useEffect(() => {
    const p = player.current
    return () => p.stop(false)
  }, [])

  const stopPlayback = () => {
    player.current.stop(false)
    setPlayingFrom(null)
  }

  const play = async () => {
    if (playingFrom) {
      stopPlayback()
      return
    }
    unlockAudio()
    const ms = catDone ? FULL_PREVIEW_MS : snippetFor(cat)
    setLoadingClip(true)
    setClipError(null)
    try {
      await player.current.play(answer.appleId!, 0, ms, settings.volume, () => setPlayingFrom(null))
      setPlayingFrom({ at: performance.now(), ms })
    } catch (e) {
      setClipError((e as Error).message)
    } finally {
      setLoadingClip(false)
    }
  }

  const record = (next: CategoryState) => {
    stopPlayback()
    const updated: State = { ...state, [active]: next }
    setState(updated)
    if (categories.every((c) => isFinished(updated[c.id] ?? emptyCategory()))) {
      const solved = categories.filter((c) => isSolved(updated[c.id])).length
      finish(solved >= winThreshold(categories.length), String(solved), solved)
    } else if (isFinished(next)) {
      const nextCat = categories.find((c) => c.id !== active && !isFinished(updated[c.id] ?? emptyCategory()))
      if (nextCat) window.setTimeout(() => toast(`${L('Próxima categoria', 'Next category')}: ${nextCat.name}`), 600)
    }
  }

  const guess = (opt: Option) => {
    if (catDone) return
    const correct = opt.id === answer.id
    const guessed = songsById.get(opt.id)
    const sameArtist = !correct && !!guessed && isSameArtist(guessed, answer)
    record({ attempts: [...cat.attempts, { kind: 'guess', id: opt.id, label: opt.label, correct, sameArtist }] })
    if (sameArtist) toast(L('Artista certo! Mas não é essa música. 🟨', 'Right artist! But not this song. 🟨'))
    else if (!correct) toast(L('Não é essa! O trecho ficou maior.', 'Not that one! The snippet got longer.'))
  }

  const skip = () => {
    if (catDone) return
    record({ attempts: [...cat.attempts, { kind: 'skip' }] })
  }

  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const options: Option[] = useMemo(() => songs.map((s) => ({ id: s.id, label: songLabel(s), keys: [s.title, s.artist] })), [songs])
  const excluded = useMemo(() => new Set(cat.attempts.flatMap((a) => (a.kind === 'guess' ? [a.id] : []))), [cat.attempts])
  const share = shareText(game.shareName, number, categories, state)
  const solvedCount = categories.filter((c) => isSolved(state[c.id] ?? emptyCategory())).length
  const unlocked = catDone ? SNIPPETS_MS[SNIPPETS_MS.length - 1] : snippetFor(cat)
  const buckets = Array.from({ length: categories.length + 1 }, (_, i) => String(i))

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={buckets}
      highlightBucket={status === 'won' || status === 'lost' ? String(solvedCount) : null}
      bucketLabel={(b) => `${b}/${categories.length}`}
      help={L(
        <>
          <p>Ouça um <strong>trechinho</strong> e adivinhe a música. Errou ou pulou? O trecho aumenta: {SNIPPETS_MS.map(sec).join(' → ')}.</p>
          <p>As músicas são as <strong>mais tocadas da história do Spotify</strong>. São {categories.length} categorias por dia ({categories.map((c) => c.name).join(', ')}), com {MAX_TRIES} tentativas cada. Acertando {winThreshold(categories.length)} ou mais, o dia conta como vitória.</p>
          <p>Digite o nome da música ou do artista e escolha na lista. Se errar a música mas acertar o artista, o palpite fica <span className="rounded px-1 tile-near">amarelo</span>.</p>
          <p className="text-muted-foreground">Prévias cedidas pela Apple Music.</p>
        </>,
        <>
          <p>Listen to a <strong>tiny snippet</strong> and guess the song. Wrong or skipped? The snippet gets longer: {SNIPPETS_MS.map(sec).join(' → ')}.</p>
          <p>The songs are the <strong>most streamed in Spotify history</strong>. There are {categories.length} categories a day ({categories.map((c) => c.name).join(', ')}), with {MAX_TRIES} tries each. Get {winThreshold(categories.length)} or more and the day counts as a win.</p>
          <p>Type the song or artist name and pick from the list. If you miss the song but get the artist right, the guess turns <span className="rounded px-1 tile-near">yellow</span>.</p>
          <p className="text-muted-foreground">Previews provided by Apple Music.</p>
        </>,
      )}
      gameSettings={
        <label className="block text-sm">
          <span className="mb-2 flex items-center gap-2">
            <Volume2 className="size-4" aria-hidden /> Volume: {settings.volume}%
          </span>
          <Slider min={10} max={100} step={5} value={[settings.volume]} onValueChange={([v]) => update({ volume: v })} aria-label="Volume" />
        </label>
      }
      result={
        <>
          <p className="text-center">
            {L('Você acertou', 'You got')} <strong>{solvedCount} {L('de', 'of')} {categories.length}</strong> {L('categorias', 'categories')}.
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
      <nav className="mb-4 flex flex-wrap gap-2" aria-label={L('Categorias', 'Categories')}>
        {categories.map((c) => {
          const s = state[c.id] ?? emptyCategory()
          const fin = isFinished(s)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                stopPlayback()
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

      <div className="mx-auto w-full max-w-lg space-y-4">
        <SnippetBar unlocked={unlocked} playingFrom={playingFrom} />

        <div className="flex items-center justify-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => void play()}
            className="grid size-24 place-items-center rounded-full bg-primary text-primary-foreground sticker sticker-press"
            aria-label={playingFrom ? L('Parar', 'Stop') : `${L('Ouvir', 'Play')} ${sec(catDone ? FULL_PREVIEW_MS : snippetFor(cat))}`}
          >
            {loadingClip ? (
              <span className="size-8 animate-spin rounded-full border-4 border-current/30 border-t-current" aria-hidden />
            ) : playingFrom ? (
              <Pause className="size-10" />
            ) : (
              <PlayIcon className="size-10 translate-x-0.5" />
            )}
          </motion.button>
          {!catDone && (
            <Button variant="pop-outline" onClick={skip}>
              <SkipForward aria-hidden /> {cat.attempts.length === MAX_TRIES - 1
                ? L('Desistir', 'Give up')
                : `${L('Pular', 'Skip')} (+${sec(SNIPPETS_MS[Math.min(cat.attempts.length + 1, MAX_TRIES - 1)] - snippetFor(cat))})`}
            </Button>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          {clipError
            ? clipError
            : catDone
              ? L('Toque para ouvir a prévia completa (30 s).', 'Tap to hear the full preview (30 s).')
              : L(
                  `Tentativa ${cat.attempts.length + 1} de ${MAX_TRIES} · trecho de ${sec(snippetFor(cat))}`,
                  `Try ${cat.attempts.length + 1} of ${MAX_TRIES} · ${sec(snippetFor(cat))} snippet`,
                )}
        </p>

        {!catDone && (
          <Autocomplete
            options={options}
            excludeIds={excluded}
            label={L('Nome da música', 'Song name')}
            placeholder={L('Música ou artista…', 'Song or artist…')}
            onSelect={guess}
            onInvalid={(text, s) =>
              toast.error(
                s
                  ? L(`Não achei "${text}". Seria ${s.label}?`, `Couldn't find "${text}". Did you mean ${s.label}?`)
                  : L('Escolha uma música da lista.', 'Pick a song from the list.'),
              )
            }
          />
        )}

        <ol className="space-y-1.5">
          {Array.from({ length: MAX_TRIES }, (_, i) => {
            const a = cat.attempts[i]
            const cls = !a ? 'border-dashed border-ink/15' : a.kind === 'skip' ? 'bg-muted border-ink/10' : a.correct ? 'tile-hit' : a.sameArtist ? 'tile-near' : 'tile-far'
            return (
              <li key={i} className={`flex h-11 items-center rounded-xl border-2 px-3 text-sm font-semibold ${cls}`}>
                {!a ? '' : a.kind === 'skip' ? L('Pulou', 'Skipped') : a.label}
                {a?.kind === 'guess' && a.sameArtist && <span className="ml-auto pl-2 text-xs font-normal">{L('artista certo', 'right artist')}</span>}
              </li>
            )
          })}
        </ol>

        {catDone && (
          <div className="flex gap-3 rounded-2xl bg-card p-3 sticker">
            {info?.artworkUrl && <img src={info.artworkUrl} alt="" className="size-20 shrink-0 rounded-lg" />}
            <div className="min-w-0 space-y-1">
              <p className="font-heading text-lg leading-tight">
                {isSolved(cat) ? L('Acertou! 🎉 ', 'Got it! 🎉 ') : L('Era essa: ', 'It was: ')}
                {songLabel(answer)}
              </p>
              <p className="text-sm">{emojiRow(cat)}</p>
              <p className="flex flex-wrap gap-x-3 text-xs">
                {info && (
                  <a className="underline" href={info.trackViewUrl} target="_blank" rel="noopener noreferrer">
                    {L('Ouvir na Apple Music', 'Listen on Apple Music')}
                  </a>
                )}
                <a className="underline" href={trackUrl(answer.id)} target="_blank" rel="noopener noreferrer">
                  {L('Abrir no Spotify', 'Open in Spotify')}
                </a>
              </p>
              <p className="text-xs text-muted-foreground">{L('Prévia cedida pela Apple Music', 'Preview provided by Apple Music')}</p>
            </div>
          </div>
        )}

        {(status === 'won' || status === 'lost') && <ShareButton text={share} />}
      </div>
    </GameShell>
  )
}
