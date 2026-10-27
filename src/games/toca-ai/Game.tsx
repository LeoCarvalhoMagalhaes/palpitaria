import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Pause, Play as PlayIcon, SkipForward, Volume2 } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AUDIO_CATEGORIES } from '@/config/soundcloud-sources'
import { useDailyGame } from '@/core/hooks'
import { useSettings } from '@/core/settings'
import { loadPlaylist, playSnippet, soundLabel, splitTitle, widgetSrc, type LoadedPlaylist } from '@/core/soundcloud'
import {
  MAX_TRIES,
  SNIPPETS_MS,
  WIN_CATEGORIES,
  dailyTrackIndex,
  emojiRow,
  formatSeconds,
  isFinished,
  isSolved,
  playlistOrder,
  shareText,
  snippetFor,
  type CategoryState,
} from './logic'

type State = Record<string, CategoryState>

const emptyCat = (): CategoryState => ({ attempts: [], answer: null, done: false })

interface Loaded {
  playlist: LoadedPlaylist
  url: string
  options: Option[]
  /** Índice (na playlist) da faixa do dia. */
  answerIndex: number
}

export default function TocaAiGame(ctx: GameContext) {
  const { game, date, number } = ctx
  const { settings, update } = useSettings()
  const daily = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => Object.fromEntries(AUDIO_CATEGORIES.map((c) => [c.id, emptyCat()])),
  })
  const { state, setState, finish, status } = daily
  const [active, setActive] = useState(() => AUDIO_CATEGORIES.find((c) => !isFinished(state[c.id] ?? emptyCat()))?.id ?? AUDIO_CATEGORIES[0].id)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [attemptLoad, setAttemptLoad] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)

  const category = AUDIO_CATEGORIES.find((c) => c.id === active)!
  const cat = state[active] ?? emptyCat()
  const catDone = isFinished(cat)

  // Carrega a playlist da categoria (com reservas, se a do dia falhar).
  useEffect(() => {
    let alive = true
    let current: LoadedPlaylist | null = null
    setLoaded(null)
    setLoadError(null)
    setPlaying(false)
    ;(async () => {
      for (const url of playlistOrder(category, number)) {
        try {
          const pl = await loadPlaylist(url)
          current = pl
          const titled = pl.sounds.map((s, i) => ({ s, i })).filter((x) => x.s.title)
          if (titled.length < 5) {
            pl.destroy()
            continue
          }
          if (!alive) return pl.destroy()
          const pick = titled[dailyTrackIndex(titled.length, number, url)]
          setLoaded({
            playlist: pl,
            url,
            answerIndex: pick.i,
            options: titled.map(({ s }) => ({ id: String(s.id), label: soundLabel(s), keys: [s.title ?? '', splitTitle(s).song] })),
          })
          return
        } catch {
          // tenta a próxima playlist
        }
      }
      if (alive) setLoadError('Nenhuma playlist desta categoria respondeu agora. Verifique a conexão e tente de novo.')
    })()
    return () => {
      alive = false
      stopRef.current?.()
      current?.destroy()
    }
  }, [category, number, attemptLoad])

  const answerSound = loaded ? loaded.playlist.sounds[loaded.answerIndex] : null

  const play = () => {
    if (!loaded) return
    if (playing) {
      stopRef.current?.()
      return
    }
    setPlaying(true)
    const len = catDone ? 30000 : snippetFor(cat)
    stopRef.current = playSnippet(loaded.playlist, loaded.answerIndex, 0, len, settings.volume, () => setPlaying(false))
  }

  const record = (next: CategoryState) => {
    const answer = next.answer ?? (answerSound ? { id: answerSound.id, label: soundLabel(answerSound), url: answerSound.permalink_url ?? loaded!.url } : null)
    const updated: State = { ...state, [active]: { ...next, answer, done: isFinished(next) } }
    setState(updated)
    if (AUDIO_CATEGORIES.every((c) => isFinished(updated[c.id] ?? emptyCat()))) {
      const solved = AUDIO_CATEGORIES.filter((c) => isSolved(updated[c.id])).length
      finish(solved >= WIN_CATEGORIES, String(solved), solved)
    }
    if (isFinished(next)) {
      const nextCat = AUDIO_CATEGORIES.find((c) => c.id !== active && !isFinished(updated[c.id] ?? emptyCat()))
      if (nextCat) window.setTimeout(() => toast(`Próxima categoria: ${nextCat.name}`), 600)
    }
  }

  const guess = (opt: Option) => {
    if (!answerSound || catDone) return
    stopRef.current?.()
    const correct = opt.id === String(answerSound.id)
    record({ ...cat, attempts: [...cat.attempts, { kind: 'guess', id: Number(opt.id), label: opt.label, correct }] })
    if (!correct) toast('Não é essa! O trecho ficou maior.')
  }

  const skip = () => {
    if (catDone || !loaded) return
    stopRef.current?.()
    record({ ...cat, attempts: [...cat.attempts, { kind: 'skip' }] })
  }

  const share = shareText(game.shareName, number, AUDIO_CATEGORIES, state)
  const solvedCount = AUDIO_CATEGORIES.filter((c) => isSolved(state[c.id] ?? emptyCat())).length
  const total = SNIPPETS_MS[SNIPPETS_MS.length - 1]
  const unlocked = catDone ? total : snippetFor(cat)

  const excluded = useMemo(
    () => new Set(cat.attempts.filter((a) => a.kind === 'guess').map((a) => String((a as { id: number }).id))),
    [cat.attempts],
  )

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['0', '1', '2', '3', '4']}
      highlightBucket={status === 'won' || status === 'lost' ? String(solvedCount) : null}
      bucketLabel={(b) => `${b}/4`}
      help={
        <>
          <p>Ouça um <strong>trechinho</strong> e adivinhe a música. Errou ou pulou? O trecho aumenta: {SNIPPETS_MS.map(formatSeconds).join(' → ')}.</p>
          <p>São <strong>{AUDIO_CATEGORIES.length} categorias</strong> por dia ({AUDIO_CATEGORIES.map((c) => c.name).join(', ')}), com {MAX_TRIES} tentativas cada. Acertando {WIN_CATEGORIES} ou mais, o dia conta como vitória.</p>
          <p>Digite o nome da música ou do artista e escolha na lista.</p>
          <p className="text-muted-foreground">
            O áudio vem de playlists públicas do SoundCloud, tocadas pelo player oficial. No celular, toque em Ouvir para liberar o som.
          </p>
        </>
      }
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
            Você acertou <strong>{solvedCount} de {AUDIO_CATEGORIES.length}</strong> categorias.
          </p>
          <ul className="space-y-1 text-sm">
            {AUDIO_CATEGORIES.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>{c.name}</span>
                <span className="truncate text-right text-muted-foreground">{state[c.id]?.answer?.label ?? '—'}</span>
              </li>
            ))}
          </ul>
          <ShareButton text={share} />
        </>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Categorias">
        {AUDIO_CATEGORIES.map((c) => {
          const s = state[c.id] ?? emptyCat()
          const fin = isFinished(s)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              aria-pressed={active === c.id}
              className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${
                active === c.id ? 'border-ink bg-ink text-background' : 'border-ink/20'
              }`}
            >
              {c.name} {fin ? (isSolved(s) ? '✓' : '✗') : ''}
            </button>
          )
        })}
      </nav>

      {loadError ? (
        <ErrorBox message={loadError} onRetry={() => setAttemptLoad((n) => n + 1)} />
      ) : (
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="flex h-4 overflow-hidden rounded-full border-2 border-ink/20 bg-muted" aria-label={`Trecho liberado: ${formatSeconds(unlocked)}`}>
            {SNIPPETS_MS.map((ms, i) => {
              const prev = i === 0 ? 0 : SNIPPETS_MS[i - 1]
              const width = Math.max(4, ((ms - prev) / total) * 100)
              const on = ms <= unlocked
              return <span key={ms} style={{ width: `${width}%` }} className={`border-r border-background ${on ? 'bg-brand' : ''}`} />
            })}
          </div>

          <div className="flex items-center justify-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={play}
              disabled={!loaded}
              className="grid size-24 place-items-center rounded-full bg-primary text-primary-foreground sticker sticker-press disabled:opacity-60"
              aria-label={playing ? 'Parar' : `Ouvir ${formatSeconds(catDone ? 30000 : snippetFor(cat))}`}
            >
              {!loaded ? (
                <span className="size-8 animate-spin rounded-full border-4 border-white/40 border-t-white" aria-hidden />
              ) : playing ? (
                <Pause className="size-10" />
              ) : (
                <PlayIcon className="size-10 translate-x-0.5" />
              )}
            </motion.button>
            {!catDone && (
              <Button variant="pop-outline" onClick={skip} disabled={!loaded}>
                <SkipForward aria-hidden /> Pular
              </Button>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {!loaded
              ? 'Carregando a playlist do SoundCloud…'
              : catDone
                ? 'Toque para ouvir mais da música.'
                : `Tentativa ${cat.attempts.length + 1} de ${MAX_TRIES} · trecho de ${formatSeconds(snippetFor(cat))}`}
          </p>

          {!catDone && loaded && (
            <Autocomplete
              options={loaded.options}
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
                {isSolved(cat) ? 'Acertou! 🎉' : 'Era essa:'} {cat.answer?.label}
              </p>
              <p className="text-sm">{emojiRow(cat)}</p>
              {cat.answer?.url && (
                <iframe
                  title={`Player do SoundCloud: ${cat.answer.label}`}
                  className="h-28 w-full rounded-xl"
                  allow="autoplay"
                  src={widgetSrc(cat.answer.url, true)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Áudio via SoundCloud · playlist{' '}
                <a className="underline" href={loaded?.url} target="_blank" rel="noreferrer">
                  {category.playlists.find((p) => p.url === loaded?.url)?.curator ?? 'pública'}
                </a>
              </p>
            </div>
          )}

          {(status === 'won' || status === 'lost') && <ShareButton text={share} />}
        </div>
      )}
    </GameShell>
  )
}
