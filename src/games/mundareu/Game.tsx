import { lazy, Suspense, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Dumbbell, Eye } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Autocomplete, type Option } from '@/components/Autocomplete'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang, useSettings } from '@/core/settings'
import { readJSON, writeJSON } from '@/core/storage'
import {
  ANSWER_COLOR,
  Distances,
  PALETTES,
  PALETTE_EN,
  TERRITORY_COLOR,
  dailyCountry,
  formatDistance,
  proximityColor,
  proximityMessage,
  shareGrid,
  type Country,
  type DistanceTable,
  type Palette,
} from './logic'

const GlobeView = lazy(() => import('./GlobeView').then((m) => ({ default: m.GlobeView })))

interface Data {
  countries: Country[]
  byId: Map<string, Country>
  distances: Distances
  playableIds: string[]
}

async function loadData(): Promise<Data> {
  const [c, d] = await Promise.all([
    fetchData<{ countries: Country[] }>('mundareu/countries.json'),
    fetchData<DistanceTable>('mundareu/distances.json'),
  ])
  return {
    countries: c.countries,
    byId: new Map(c.countries.map((x) => [x.id, x])),
    distances: new Distances(d),
    playableIds: c.countries.filter((x) => x.playable).map((x) => x.id),
  }
}

interface State {
  guesses: string[]
}

export default function MundareuGame(ctx: GameContext) {
  const L = useL()
  const lang = useLang()
  const data = useData(loadData)
  // Em inglês, os nomes exibidos (globo, lista, compartilhamento) passam a ser os ingleses.
  const localized = useMemo(() => {
    if (data.status !== 'ready') return null
    if (lang !== 'en') return data.data
    const countries = data.data.countries.map((c) => ({ ...c, name: c.nameEn, nameEn: c.name }))
    return { ...data.data, countries, byId: new Map(countries.map((x) => [x.id, x])) }
  }, [data, lang])
  if (data.status === 'loading') return <LoadingScreen label={L('Girando o globo…', 'Spinning the globe…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} data={localized!} />
}

function Play({ ctx, data }: { ctx: GameContext; data: Data }) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const dist = (km: number) => formatDistance(km, settings.units, lang)
  const { settings, resolvedTheme, update } = useSettings()
  const [palette, setPalette] = useState<Palette>(() => readJSON('mundareu:palette', 'Padrão'))
  const [showLabels, setShowLabels] = useState<boolean>(() => readJSON('mundareu:labels', false))
  const [sortBy, setSortBy] = useState<'ordem' | 'distancia'>('distancia')
  const [message, setMessage] = useState(() => L('Digite o nome de qualquer país para dar o primeiro palpite.', 'Type the name of any country to make your first guess.'))
  const [practice, setPractice] = useState<{ answer: string; guesses: string[]; revealed: boolean } | null>(null)

  const dailyAnswer = useMemo(() => dailyCountry(data.playableIds, number), [data.playableIds, number])
  const daily = useDailyGame<State>({ slug: ctx.stateKey, version: 1, date, isArchive: ctx.isArchive, init: () => ({ guesses: [] }) })

  const answer = practice ? practice.answer : dailyAnswer
  const guesses = practice ? practice.guesses : daily.state.guesses
  const won = guesses.includes(answer)
  const finished = practice ? won || practice.revealed : daily.status === 'won'

  const entries = guesses.map((id) => ({ id, km: data.distances.get(id, answer), isAnswer: id === answer }))

  const colors = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      map.set(e.id, e.isAnswer ? ANSWER_COLOR : proximityColor(e.km, palette, settings.highContrast))
      for (const c of data.countries) if (c.parent === e.id) map.set(c.id, TERRITORY_COLOR)
    }
    if (practice?.revealed) map.set(answer, ANSWER_COLOR)
    return map
  }, [entries, palette, settings.highContrast, data.countries, practice, answer])

  const last = guesses.length ? data.byId.get(guesses[guesses.length - 1]) ?? null : null
  const focus = practice?.revealed ? data.byId.get(answer) ?? null : last

  const options: Option[] = useMemo(
    () =>
      data.countries
        .filter((c) => c.playable)
        .map((c) => ({ id: c.id, label: c.name, keys: [c.nameEn, ...c.aliases] })),
    [data.countries],
  )

  const guess = (opt: Option) => {
    if (finished) return
    if (guesses.includes(opt.id)) {
      toast(L('Esse você já tentou 😉', 'You already tried that one 😉'))
      return
    }
    const km = data.distances.get(opt.id, answer)
    const best = entries.length ? Math.min(...entries.map((e) => e.km)) : null
    const next = [...guesses, opt.id]
    if (opt.id === answer) {
      setMessage(
        L(
          `É ${opt.label}! Você achou o país misterioso em ${next.length} ${next.length === 1 ? 'palpite' : 'palpites'}. 🎉`,
          `It's ${opt.label}! You found the mystery country in ${next.length} ${next.length === 1 ? 'guess' : 'guesses'}. 🎉`,
        ),
      )
    } else {
      setMessage(proximityMessage(opt.label, km, best, lang))
    }
    if (practice) {
      setPractice({ ...practice, guesses: next })
    } else {
      daily.setState({ guesses: next })
      if (opt.id === answer) daily.finish(true, next.length > 10 ? '11+' : String(next.length), next.length)
    }
  }

  const sorted = [...entries].sort((a, b) => (sortBy === 'distancia' ? a.km - b.km : 0))
  const closest = entries.filter((e) => !e.isAnswer).sort((a, b) => a.km - b.km)[0]
  const share = `${game.shareName} #${number} · ${guesses.length} ${guesses.length === 1 ? L('palpite', 'guess') : L('palpites', 'guesses')}\n${shareGrid(entries)}`
  const answerName = data.byId.get(answer)?.name ?? ''

  return (
    <GameShell
      {...ctx}
      status={daily.status}
      buckets={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+']}
      highlightBucket={won && !practice ? (guesses.length > 10 ? '11+' : String(guesses.length)) : null}
      showAverage={L('Média de palpites', 'Average guesses')}
      help={L(
        <>
          <p>Todo dia tem um <strong>País Misterioso</strong>. Descubra qual é com o menor número de palpites (são ilimitados).</p>
          <p>Cada palpite aparece no globo com uma cor que mostra a distância: quanto <strong>mais quente</strong> a cor, mais perto você está.</p>
          <p>A distância é a menor distância entre as <strong>fronteiras terrestres</strong> dos dois países. Territórios (em cinza) e fronteiras marítimas não contam.</p>
          <p>Arraste o globo para girar e use a rolagem ou o pinça para dar zoom.</p>
          <p className="text-muted-foreground">Mapas: Natural Earth (domínio público). O novo país aparece à meia-noite do seu fuso.</p>
        </>,
        <>
          <p>Every day there's a <strong>Mystery Country</strong>. Find it in as few guesses as you can (they're unlimited).</p>
          <p>Each guess shows up on the globe with a color for the distance: the <strong>hotter</strong> the color, the closer you are.</p>
          <p>Distance is the shortest distance between the two countries' <strong>land borders</strong>. Territories (in gray) and maritime borders don't count.</p>
          <p>Drag the globe to spin it and scroll or pinch to zoom.</p>
          <p className="text-muted-foreground">Maps: Natural Earth (public domain). A new country appears at midnight in your time zone.</p>
        </>,
      )}
      gameSettings={
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm">
            {L('Mostrar nomes ao passar o mouse', 'Show names on hover')}
            <Switch
              checked={showLabels}
              onCheckedChange={(v) => {
                setShowLabels(v)
                writeJSON('mundareu:labels', v)
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            {L('Distâncias em milhas', 'Distances in miles')}
            <Switch checked={settings.units === 'mi'} onCheckedChange={(v) => update({ units: v ? 'mi' : 'km' })} />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm">{L('Cores', 'Colors')}</legend>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={palette === p}
                  onClick={() => {
                    setPalette(p)
                    writeJSON('mundareu:palette', p)
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 text-sm ${palette === p ? 'border-brand bg-accent' : 'border-ink/15'}`}
                >
                  <span className="h-3 w-8 rounded" style={{ background: `linear-gradient(90deg, ${proximityColor(15000, p, settings.highContrast)}, ${proximityColor(0, p, settings.highContrast)})` }} />
                  {lang === 'en' ? PALETTE_EN[p] : p}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      }
      result={
        <>
          <p className="text-center text-base">
            {L('O país era', 'The country was')} <strong className="font-heading text-xl">{answerName}</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      {practice && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-sun/40 px-3 py-2 text-sm">
          <span>
            <Dumbbell className="mr-1 inline size-4" aria-hidden /> {L('Modo treino: não conta nas estatísticas.', "Practice mode: doesn't count toward your stats.")}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setPractice(null)}>
            {L('Sair do treino', 'Leave practice')}
          </Button>
        </div>
      )}

      <Suspense fallback={<div className="mx-auto aspect-square w-full max-w-[520px] animate-pulse rounded-full bg-muted" />}>
        <GlobeView countries={data.countries} colors={colors} focus={focus} dark={resolvedTheme === 'dark'} showLabels={showLabels} />
      </Suspense>

      <p className="my-3 min-h-6 text-center font-heading text-lg" aria-live="polite">
        {practice?.revealed ? L(`Era ${answerName}!`, `It was ${answerName}!`) : message}
      </p>

      {!finished && (
        <Autocomplete
          options={options}
          excludeIds={new Set(guesses)}
          label={L('Nome do país', 'Country name')}
          placeholder={L('Digite um país…', 'Type a country…')}
          onSelect={guess}
          onInvalid={(text, suggestion) =>
            toast.error(
              suggestion
                ? L(`"${text}" não está na lista. Você quis dizer ${suggestion.label}?`, `"${text}" isn't on the list. Did you mean ${suggestion.label}?`)
                : L(`"${text}" não está na lista.`, `"${text}" isn't on the list.`),
            )
          }
        />
      )}

      {finished && !practice && (
        <div className="mx-auto mt-2 flex w-full max-w-sm flex-col gap-2">
          <ShareButton text={share} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {closest && (
          <p className="text-sm">
            {L('Fronteira mais próxima', 'Closest border')}: <strong>{data.byId.get(closest.id)?.name}</strong> · {dist(closest.km)}
          </p>
        )}
        {entries.length > 1 && (
          <div className="flex gap-1 text-sm" role="group" aria-label={L('Ordenar palpites', 'Sort guesses')}>
            {(['distancia', 'ordem'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sortBy === s}
                onClick={() => setSortBy(s)}
                className={`rounded-full px-3 py-1 font-semibold ${sortBy === s ? 'bg-ink text-background' : 'bg-muted'}`}
              >
                {s === 'distancia' ? L('Por distância', 'By distance') : L('Por ordem', 'By order')}
              </button>
            ))}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">{L('Seus palpites aparecem aqui.', 'Your guesses show up here.')}</p>
      ) : (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border-2 border-ink/10 bg-card px-3 py-2">
              <span className="size-5 shrink-0 rounded-md border border-ink/20" style={{ background: colors.get(e.id) }} aria-hidden />
              <span className="flex-1 font-semibold">{data.byId.get(e.id)?.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {e.isAnswer ? L('É esse! 🎯', "That's it! 🎯") : e.km === 0 ? L('vizinho', 'neighbor') : dist(e.km)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {(finished || practice) && (
          <Button
            variant="pop-outline"
            onClick={() =>
              setPractice({
                answer: data.playableIds[Math.floor(Math.random() * data.playableIds.length)],
                guesses: [],
                revealed: false,
              })
            }
          >
            <Dumbbell aria-hidden /> {practice ? L('Outro país', 'Another country') : L('Jogar no modo treino', 'Play practice mode')}
          </Button>
        )}
        {practice && !finished && (
          <Button variant="ghost" onClick={() => setPractice({ ...practice, revealed: true })}>
            <Eye aria-hidden /> {L('Revelar resposta', 'Reveal answer')}
          </Button>
        )}
      </div>
    </GameShell>
  )
}
