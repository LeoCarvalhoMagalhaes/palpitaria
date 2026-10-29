import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Lightbulb, Pause, Play as PlayIcon } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, imageUrl, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang, useSettings } from '@/core/settings'
import { ClipPlayer, getPreview, unlockAudio, type PreviewInfo } from '@/core/preview'
import type { Song } from '@/config/music'
import { HINT_AFTER, MAX_GUESSES, attr, compare, countryName, dailyArtist, flagEmoji, hintFor, shareText, type Artist, type Match } from './logic'

interface State {
  guesses: string[]
  /** Número de palpites feitos quando a dica foi usada (null = não usou). */
  hintAt: number | null
}

const MATCH_CLASS: Record<Match, string> = { correct: 'tile-hit', close: 'tile-near', miss: 'bg-muted text-foreground border-ink/10' }

export default function HolofoteGame(ctx: GameContext) {
  const L = useL()
  const data = useData(() => fetchData<{ artists: Artist[] }>('holofote/artists.json'))
  if (data.status === 'loading') return <LoadingScreen label={L('Acendendo o holofote…', 'Turning on the spotlight…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} artists={data.data.artists} />
}

function Cell({ label, value, match, arrow, delay }: { label: string; value: string; match: Match; arrow?: 'up' | 'down' | null; delay: number }) {
  const L = useL()
  const arrowText = arrow === 'up' ? L(', a resposta é maior', ', the answer is higher') : arrow === 'down' ? L(', a resposta é menor', ', the answer is lower') : ''
  const matchText = match === 'correct' ? L('igual', 'same') : match === 'close' ? L('perto', 'close') : L('diferente', 'different')
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1 py-1.5 text-center ${MATCH_CLASS[match]}`}
      aria-label={`${label}: ${value}, ${matchText}${arrowText}`}
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

/** Foto do artista (Wikimedia Commons); sem foto, mostra a inicial. Clicar abre a página do arquivo (crédito e licença). */
function ArtistPhoto({ artist, className }: { artist: Artist; className?: string }) {
  const L = useL()
  const [failed, setFailed] = useState(false)
  const base = `shrink-0 overflow-hidden rounded-2xl border-2 border-ink/15 bg-muted ${className ?? ''}`
  if (!artist.image || failed) {
    return (
      <span className={`grid place-items-center font-heading text-4xl font-semibold ${base}`} aria-hidden>
        {artist.name[0]}
      </span>
    )
  }
  return (
    <a
      href={artist.image.page}
      target="_blank"
      rel="noopener noreferrer"
      className={`block ${base}`}
      title={L('Foto: Wikimedia Commons (ver licença)', 'Photo: Wikimedia Commons (see license)')}
    >
      <img
        src={imageUrl(artist.image.src)}
        alt={L(`Foto de ${artist.name}`, `Photo of ${artist.name}`)}
        className="size-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </a>
  )
}

const foldName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Como no outro jogo: no fim, toca a prévia da música mais ouvida do artista (se ele estiver no top 1.000). */
function ArtistHit({ artist }: { artist: string }) {
  const { settings } = useSettings()
  const L = useL()
  const [song, setSong] = useState<Song | null>(null)
  const [info, setInfo] = useState<PreviewInfo | null>(null)
  const [playing, setPlaying] = useState(false)
  const player = useRef(new ClipPlayer())

  useEffect(() => {
    let alive = true
    fetchData<{ songs: Song[] }>('musicas/songs.json')
      .then(({ songs }) => {
        const hit = songs.find((s) => s.appleId && foldName(s.artist) === foldName(artist))
        if (!alive || !hit) return
        setSong(hit)
        return getPreview(hit.appleId!).then((i) => alive && setInfo(i))
      })
      .catch(() => {})
    const p = player.current
    return () => {
      alive = false
      p.stop(false)
    }
  }, [artist])

  if (!song) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left sticker">
      {info?.artworkUrl && <img src={info.artworkUrl} alt="" className="size-14 rounded-lg" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{song.title}</p>
        <p className="text-xs text-muted-foreground">
          {L('Prévia cedida pela Apple Music', 'Preview provided by Apple Music')}
          {info && (
            <>
              {' · '}
              <a className="underline" href={info.trackViewUrl} target="_blank" rel="noopener noreferrer">
                {L('ouvir completa', 'listen in full')}
              </a>
            </>
          )}
        </p>
      </div>
      <Button
        variant="pop"
        size="icon-lg"
        aria-label={playing ? L('Parar', 'Stop') : L(`Ouvir ${song.title}`, `Play ${song.title}`)}
        onClick={() => {
          if (playing) {
            player.current.stop()
            return
          }
          unlockAudio()
          setPlaying(true)
          player.current.play(song.appleId!, 0, 30000, settings.volume, () => setPlaying(false)).catch(() => setPlaying(false))
        }}
      >
        {playing ? <Pause /> : <PlayIcon />}
      </Button>
    </div>
  )
}

function Play({ ctx, artists }: { ctx: GameContext; artists: Artist[] }) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const answer = useMemo(() => dailyArtist(artists, number), [artists, number])
  const byId = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: ctx.stateKey,
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
    () => artists.map((a) => ({ id: a.id, label: a.name, hint: `${flagEmoji(a.country)} ${attr(a.genre, lang)}` })),
    [artists, lang],
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
      help={L(
        <>
          <p>Descubra o <strong>artista do dia</strong> em até {MAX_GUESSES} palpites, entre os {artists.length} artistas mais ouvidos.</p>
          <p>Cada palpite mostra a foto e 6 pistas. <span className="rounded px-1 tile-hit">Verde</span> é igual; <span className="rounded px-1 tile-near">amarelo</span> está perto:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Estreia:</strong> ano do 1º álbum de estúdio. Amarelo se a diferença for de até 5 anos. ↑ estreou depois, ↓ antes.</li>
            <li><strong>Integrantes:</strong> 1 para artista solo.</li>
            <li><strong>Popularidade:</strong> posição no ranking de ouvintes. Amarelo até 50 posições. ↑ é mais popular.</li>
            <li><strong>Gênero:</strong> masculino, feminino, misto (grupo com homens e mulheres) ou não binário.</li>
            <li><strong>Estilo:</strong> um estilo musical por artista.</li>
            <li><strong>País:</strong> amarelo se for do mesmo continente.</li>
          </ul>
          <p>Travou? Depois do {HINT_AFTER}º palpite, use a <strong>dica</strong>.</p>
          <p className="text-muted-foreground">Dados: MusicBrainz e ListenBrainz (CC0). Fotos: Wikimedia Commons (licença na página de cada arquivo).</p>
        </>,
        <>
          <p>Find <strong>today's artist</strong> in up to {MAX_GUESSES} guesses, among the {artists.length} most listened-to artists.</p>
          <p>Each guess shows a photo and 6 clues. <span className="rounded px-1 tile-hit">Green</span> is a match; <span className="rounded px-1 tile-near">yellow</span> is close:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Debut:</strong> year of the first studio album. Yellow if within 5 years. ↑ debuted later, ↓ earlier.</li>
            <li><strong>Members:</strong> 1 for solo artists.</li>
            <li><strong>Popularity:</strong> position in the listener ranking. Yellow within 50 positions. ↑ is more popular.</li>
            <li><strong>Gender:</strong> male, female, mixed (a group with men and women) or non-binary.</li>
            <li><strong>Genre:</strong> one music genre per artist.</li>
            <li><strong>Country:</strong> yellow if it's on the same continent.</li>
          </ul>
          <p>Stuck? After guess {HINT_AFTER}, use the <strong>hint</strong>.</p>
          <p className="text-muted-foreground">Data: MusicBrainz and ListenBrainz (CC0). Photos: Wikimedia Commons (license on each file's page).</p>
        </>,
      )}
      result={
        <>
          <ArtistPhoto artist={answer} className="mx-auto aspect-[4/5] w-44" />
          <p className="text-center text-base">
            {L('Era', 'It was')} <strong className="font-heading text-xl">{answer.name}</strong> {flagEmoji(answer.country)}
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
            label={L('Nome do artista', 'Artist name')}
            placeholder={L('Digite um artista…', 'Type an artist…')}
            onSelect={guess}
            onInvalid={(text, s) =>
              toast.error(
                s
                  ? L(`Não achei "${text}". Seria ${s.label}?`, `Couldn't find "${text}". Did you mean ${s.label}?`)
                  : L(`"${text}" não está na lista de artistas.`, `"${text}" isn't on the artist list.`),
              )
            }
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>
              {L('Palpite', 'Guess')} {Math.min(state.guesses.length + 1, MAX_GUESSES)} {L('de', 'of')} {MAX_GUESSES}
            </span>
            {state.hintAt === null && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!canHint}
                onClick={() => setState({ ...state, hintAt: state.guesses.length })}
                title={canHint ? L('Usar dica', 'Use hint') : L(`A dica libera depois do ${HINT_AFTER}º palpite`, `The hint unlocks after guess ${HINT_AFTER}`)}
              >
                <Lightbulb aria-hidden /> {L('Dica', 'Hint')} {canHint ? '' : L(`(após ${HINT_AFTER})`, `(after ${HINT_AFTER})`)}
              </Button>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="mx-auto mb-4 w-full max-w-sm space-y-2 text-center">
          <ArtistPhoto artist={answer} className="mx-auto aspect-[4/5] w-48 sm:w-56" />
          <p className="font-heading text-xl">
            {won ? L(`Acertou! Era ${answer.name} 🎤`, `You got it! It was ${answer.name} 🎤`) : L(`Era ${answer.name}. Amanhã tem mais!`, `It was ${answer.name}. More tomorrow!`)}
          </p>
          <ArtistHit artist={answer.name} />
          <ShareButton text={share} />
        </div>
      )}

      <ol className="space-y-3" reversed>
        {[...guessed].reverse().map((g, ri) => {
          const i = guessed.length - 1 - ri
          const c = rows[i]
          const isAnswer = g.id === answer.id
          return (
            <motion.li
              key={g.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border-2 p-2 ${isAnswer ? 'border-hit' : 'border-ink/10'} bg-card`}
            >
              {state.hintAt !== null && state.hintAt === i + 1 && <p className="mb-2 rounded-lg bg-sun/40 px-2 py-1 text-sm">💡 {hintFor(answer, lang)}</p>}
              <div className="flex gap-2 sm:gap-3">
                <ArtistPhoto artist={g} className="w-24 self-stretch sm:w-36" />
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 px-1 font-heading text-lg leading-tight font-semibold sm:text-xl">
                    {g.name} {isAnswer && '🎯'}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                <Cell label={L('Estreia', 'Debut')} value={String(g.debut)} match={c.debut.match} arrow={c.debut.arrow} delay={0} />
                <Cell label={L('Integrantes', 'Members')} value={g.members === 1 ? 'Solo' : String(g.members)} match={c.members.match} delay={0.08} />
                <Cell label={L('Popularidade', 'Popularity')} value={`#${g.rank}`} match={c.popularity.match} arrow={c.popularity.arrow} delay={0.16} />
                <Cell label={L('Gênero', 'Gender')} value={attr(g.gender, lang)} match={c.gender.match} delay={0.24} />
                <Cell label={L('Estilo', 'Genre')} value={attr(g.genre, lang)} match={c.genre.match} delay={0.32} />
                <Cell label={L('País', 'Country')} value={`${flagEmoji(g.country)} ${countryName(g, lang)}`} match={c.country.match} delay={0.4} />
                  </div>
                </div>
              </div>
            </motion.li>
          )
        })}
      </ol>
      {guessed.length === 0 && <p className="text-center text-sm text-muted-foreground">{L('Seus palpites aparecem aqui.', 'Your guesses show up here.')}</p>}
    </GameShell>
  )
}
