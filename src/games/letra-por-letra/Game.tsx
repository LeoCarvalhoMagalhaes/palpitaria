import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Check, MessageSquareQuote, Volume2, X } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { hasVoice, onVoicesReady, speak as speakIn, speechAvailable } from '@/core/speech'
import { useL, useLang } from '@/core/settings'
import { ROUNDS, WIN_SCORE, dailyWords, isCorrect, sentenceForSpeech, shareText, type Bank } from './logic'

interface State {
  answers: string[]
}

const ACCENTS = ['á', 'à', 'â', 'ã', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç', '-']
/** Em inglês, só hífen e apóstrofo. */
const ACCENTS_EN = ['-', "'"]

export default function LetraPorLetraGame(ctx: GameContext) {
  const L = useL()
  const lang = useLang()
  const file = lang === 'en' ? 'letra-por-letra/words-en.json' : 'letra-por-letra/words.json'
  const data = useData(() => fetchData<{ niveis: Bank }>(file), [file])
  if (data.status === 'loading') return <LoadingScreen label={L('Afinando a voz…', 'Warming up the voice…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} bank={data.data.niveis} />
}

function Play({ ctx, bank }: { ctx: GameContext; bank: Bank }) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const speak = (text: string, rate?: number) => speakIn(text, rate, lang)
  const words = useMemo(() => dailyWords(bank, number), [bank, number])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ answers: [] }),
  })
  const [typed, setTyped] = useState('')
  const [reveal, setReveal] = useState<null | 'definicao' | 'frase'>(null)
  const [showResult, setShowResult] = useState(false)
  const [voiceOk, setVoiceOk] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => onVoicesReady(() => setVoiceOk(hasVoice(lang))), [lang])

  const results = state.answers.map((a, i) => isCorrect(a, words[i].palavra))
  const score = results.filter(Boolean).length
  const finished = status === 'won' || status === 'lost'
  // Depois de responder, a rodada fica na tela até a pessoa tocar em "Próxima".
  const round = showResult ? state.answers.length - 1 : state.answers.length
  const entry = words[Math.min(round, ROUNDS - 1)]

  const submit = () => {
    if (!typed.trim() || showResult || finished) return
    const answers = [...state.answers, typed.trim()]
    setState({ answers })
    setShowResult(true)
    if (answers.length === ROUNDS) {
      const final = answers.filter((a, i) => isCorrect(a, words[i].palavra)).length
      finish(final >= WIN_SCORE, String(final), final)
    }
  }

  const next = () => {
    setShowResult(false)
    setTyped('')
    setReveal(null)
    if (state.answers.length < ROUNDS) {
      window.setTimeout(() => {
        speak(words[state.answers.length].palavra)
        inputRef.current?.focus()
      }, 200)
    }
  }

  const share = shareText(game.shareName, number, results)
  const lastCorrect = showResult ? results[round] : null
  const allDone = finished && !showResult

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['0', '1', '2', '3', '4', '5']}
      highlightBucket={finished ? String(score) : null}
      showAverage={L('Média de acertos', 'Average score')}
      help={L(
        <>
          <p>São <strong>5 rodadas</strong>, cada uma mais difícil. Toque em <strong>Ouvir</strong>, escute a palavra e escreva do jeitinho certo.</p>
          <p>Acentos, cedilha e hífen contam! Use os botões de acento se o seu teclado não tiver.</p>
          <p>Ficou na dúvida? Peça a <strong>definição</strong> ou uma <strong>frase de exemplo</strong>. Você tem <strong>uma tentativa</strong> por rodada.</p>
          <p>Acertando 3 ou mais, o dia conta como vitória para a sequência.</p>
          <p className="text-muted-foreground">A voz é a do seu próprio aparelho (pt-BR).</p>
        </>,
        <>
          <p>There are <strong>5 rounds</strong>, each one harder. Tap <strong>Listen</strong>, hear the word and spell it exactly right.</p>
          <p>Hyphens and apostrophes count! American spelling is used.</p>
          <p>Not sure? Ask for the <strong>definition</strong> or an <strong>example sentence</strong>. You get <strong>one try</strong> per round.</p>
          <p>Get 3 or more right and the day counts as a win for your streak.</p>
          <p className="text-muted-foreground">The voice comes from your own device (en-US).</p>
        </>,
      )}
      result={
        <>
          <p className="text-center">
            {L('Você acertou', 'You got')} <strong>{score} {L('de', 'of')} {ROUNDS}</strong>.
          </p>
          <ul className="space-y-1 text-sm">
            {words.map((w, i) => (
              <li key={w.palavra} className="flex justify-between gap-2">
                <span>{i + 1}. <strong>{w.palavra}</strong></span>
                <span className={results[i] ? 'text-hit' : 'text-far'}>{results[i] ? '✓' : `✗ ${state.answers[i] ?? ''}`}</span>
              </li>
            ))}
          </ul>
          <ShareButton text={share} />
        </>
      }
    >
      {(!speechAvailable() || !voiceOk) && (
        <p className="mb-3 rounded-xl bg-sun/40 px-3 py-2 text-center text-sm" role="alert">
          {L(
            'Não encontramos uma voz em português neste aparelho. Use a definição e a frase como pistas, ou tente outro navegador.',
            "We couldn't find an English voice on this device. Use the definition and the sentence as clues, or try another browser.",
          )}
        </p>
      )}

      <ol className="mb-5 flex justify-center gap-2" aria-label={L('Rodadas', 'Rounds')}>
        {words.map((_, i) => {
          const done = i < state.answers.length
          const cls = done ? (results[i] ? 'tile-hit' : 'tile-far') : i === round ? 'border-ink bg-card' : 'border-ink/15 bg-card'
          return (
            <li key={i} className={`grid size-10 place-items-center rounded-full border-2 font-heading font-semibold ${cls}`} aria-current={i === round}>
              {done ? (results[i] ? <Check className="size-5" /> : <X className="size-5" />) : i + 1}
            </li>
          )
        })}
      </ol>

      {!allDone ? (
        <div className="mx-auto w-full max-w-md space-y-4 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase">{L('Rodada', 'Round')} {round + 1} · {L('nível', 'level')} {round + 1}</p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => speak(entry.palavra)}
            className="mx-auto grid size-28 place-items-center rounded-full bg-primary text-primary-foreground sticker sticker-press"
            aria-label={L('Ouvir a palavra', 'Listen to the word')}
          >
            <Volume2 className="size-12" />
          </motion.button>
          <div className="flex justify-center gap-2">
            <Button
              variant="pop-outline"
              size="sm"
              onClick={() => {
                setReveal('definicao')
                speak(entry.definicao, 1)
              }}
            >
              <BookOpen aria-hidden /> {L('Definição', 'Definition')}
            </Button>
            <Button
              variant="pop-outline"
              size="sm"
              onClick={() => {
                setReveal('frase')
                speak(sentenceForSpeech(entry), 1)
              }}
            >
              <MessageSquareQuote aria-hidden /> {L('Frase', 'Sentence')}
            </Button>
          </div>
          {reveal && (
            <p className="rounded-xl bg-muted px-4 py-3 text-left">
              <strong>{reveal === 'definicao' ? L('Definição: ', 'Definition: ') : L('Frase: ', 'Sentence: ')}</strong>
              {reveal === 'definicao' ? entry.definicao : entry.frase}
            </p>
          )}

          {!showResult ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              className="space-y-2"
            >
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={L('Escreva a palavra…', 'Type the word…')}
                aria-label={L('Sua resposta', 'Your answer')}
                className="h-14 w-full rounded-xl border-2 border-ink bg-card px-4 text-center font-heading text-2xl font-semibold outline-none focus:border-brand-2"
              />
              <div className="flex flex-wrap justify-center gap-1" aria-label={L('Acentos', 'Special characters')}>
                {(lang === 'en' ? ACCENTS_EN : ACCENTS).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setTyped((t) => t + a)
                      inputRef.current?.focus()
                    }}
                    className="h-9 min-w-9 rounded-lg bg-muted px-2 font-heading text-lg hover:bg-accent"
                  >
                    {a}
                  </button>
                ))}
              </div>
              <Button type="submit" variant="pop" size="xl" className="w-full" disabled={!typed.trim()}>
                {L('Conferir', 'Check')}
              </Button>
            </form>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3" aria-live="polite">
              <p className={`rounded-xl px-4 py-3 font-heading text-xl ${lastCorrect ? 'tile-hit' : 'tile-far'}`}>
                {lastCorrect ? L('Certinho! ✨', 'Spot on! ✨') : L('Quase!', 'So close!')} {L('A grafia é', 'It is spelled')} <strong>{entry.palavra}</strong>
              </p>
              {state.answers.length < ROUNDS ? (
                <Button variant="pop" size="xl" className="w-full" onClick={next} autoFocus>
                  {L('Próxima palavra', 'Next word')}
                </Button>
              ) : (
                <Button variant="pop" size="xl" className="w-full" onClick={() => setShowResult(false)} autoFocus>
                  {L('Ver resultado', 'See results')}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-md space-y-3 text-center">
          <p className="font-heading text-2xl">{score === ROUNDS ? L('Gabaritou! 🐝', 'Perfect score! 🐝') : L(`${score} de ${ROUNDS} certas`, `${score} of ${ROUNDS} right`)}</p>
          <ShareButton text={share} />
        </div>
      )}
    </GameShell>
  )
}
