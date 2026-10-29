import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Minus, Plus, Target } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Button } from '@/components/ui/button'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang } from '@/core/settings'
import { readJSON, writeJSON } from '@/core/storage'
import {
  CONSTRUCT_ATTEMPTS,
  CONSTRUCT_TOLERANCE,
  MAX_GUESSES,
  dailyAngle,
  evaluateConstruct,
  evaluateGuess,
  shareText,
  type GuessFeedback,
} from './logic'

type ArcStyle = 'suave' | 'tracejado' | 'nenhum'

interface State {
  guesses: number[]
  construct: number[] | null
}

const RADIUS = 120
const CENTER = 150

function point(deg: number, r = RADIUS) {
  const rad = (deg * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER - r * Math.sin(rad) }
}

function AngleDrawing({
  start,
  sweep,
  arc,
  ghosts = [],
  truth,
  onDrag,
  label,
  small,
}: {
  start: number
  sweep: number
  arc: ArcStyle
  ghosts?: number[]
  truth?: number | null
  /** Se informado, a linha laranja pode ser arrastada: recebe o novo ângulo (1–359). */
  onDrag?: (sweep: number) => void
  label: string
  small?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const a = point(start)
  const b = point(start + sweep)
  const arcR = 46
  const arcStart = point(start, arcR)
  const arcEnd = point(start + sweep, arcR)
  const largeArc = sweep > 180 ? 1 : 0

  const fromPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg || !onDrag) return
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 300 - CENTER
    const y = CENTER - ((e.clientY - rect.top) / rect.height) * 300
    const deg = (Math.atan2(y, x) * 180) / Math.PI
    const rel = Math.round((((deg - start) % 360) + 360) % 360)
    onDrag(Math.min(359, Math.max(1, rel)))
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className={`mx-auto w-full ${small ? 'max-w-[140px]' : 'max-w-[300px]'} ${onDrag ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        if (!onDrag) return
        dragging.current = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        fromPointer(e)
      }}
      onPointerMove={(e) => dragging.current && fromPointer(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 14} className="fill-card stroke-ink/10" strokeWidth={2} />
      {arc !== 'nenhum' && (
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="var(--brand-2)"
          strokeWidth={arc === 'suave' ? 10 : 4}
          strokeOpacity={arc === 'suave' ? 0.35 : 0.9}
          strokeDasharray={arc === 'tracejado' ? '6 6' : undefined}
          strokeLinecap="round"
        />
      )}
      {ghosts.map((g, i) => {
        const p = point(start + g)
        return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--miss)" strokeWidth={4} strokeOpacity={0.45} strokeLinecap="round" />
      })}
      {truth != null &&
        (() => {
          const p = point(start + truth)
          return <line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--hit)" strokeWidth={6} strokeDasharray="8 6" strokeLinecap="round" />
        })()}
      <line x1={CENTER} y1={CENTER} x2={a.x} y2={a.y} stroke="var(--ink)" strokeWidth={8} strokeLinecap="round" />
      <line x1={CENTER} y1={CENTER} x2={b.x} y2={b.y} stroke="var(--brand)" strokeWidth={8} strokeLinecap="round" />
      {onDrag && <circle cx={b.x} cy={b.y} r={14} fill="var(--brand)" stroke="var(--card)" strokeWidth={4} />}
      <circle cx={CENTER} cy={CENTER} r={9} fill="var(--ink)" />
    </svg>
  )
}

/** Campo numérico com − e + que aceleram ao segurar. */
function Stepper({
  value,
  onChange,
  min,
  max,
  disabled,
  onEnter,
}: {
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  disabled?: boolean
  onEnter: () => void
}) {
  const L = useL()
  const timer = useRef<number | null>(null)
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const step = (dir: 1 | -1) => {
    const current = Number(valueRef.current) || 0
    const next = Math.min(max, Math.max(min, current + dir))
    valueRef.current = String(next)
    onChange(String(next))
  }
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  const hold = (dir: 1 | -1) => {
    step(dir)
    let delay = 400
    const tick = () => {
      step(dir)
      delay = Math.max(40, delay === 400 ? 110 : delay * 0.85)
      timer.current = window.setTimeout(tick, delay)
    }
    timer.current = window.setTimeout(tick, delay)
  }
  useEffect(() => stop, [])

  const btn = (dir: 1 | -1, label: string, Icon: typeof Plus) => (
    <Button
      type="button"
      variant="pop-outline"
      size="icon-lg"
      className="size-12 rounded-xl"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault()
        hold(dir)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          step(dir)
        }
      }}
    >
      <Icon />
    </Button>
  )

  return (
    <div className="flex items-center justify-center gap-2">
      {btn(-1, L('Diminuir um grau', 'One degree less'), Minus)}
      <label className="relative">
        <span className="sr-only">{L('Seu palpite em graus', 'Your guess in degrees')}</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
          className="h-12 w-28 rounded-xl border-2 border-ink bg-card pr-7 text-center font-heading text-2xl font-semibold tabular-nums outline-none [appearance:textfield] focus:border-brand-2 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-heading text-xl text-muted-foreground">°</span>
      </label>
      {btn(1, L('Aumentar um grau', 'One degree more'), Plus)}
    </div>
  )
}

function GuessRow({ fb }: { fb: GuessFeedback }) {
  const L = useL()
  const solved = fb.direction === 'solved'
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between rounded-xl border-2 px-4 py-2 font-heading text-lg ${solved ? 'tile-hit' : 'border-ink/15 bg-card'}`}
    >
      <span className="tabular-nums">{fb.value}°</span>
      <span className="text-base">{fb.label}</span>
      <span
        aria-label={
          solved ? L('acertou', 'correct') : fb.direction === 'up' ? L('o ângulo é maior', 'the angle is bigger') : L('o ângulo é menor', 'the angle is smaller')
        }
      >
        {solved ? <Target className="size-5" /> : fb.direction === 'up' ? <ArrowUp className="size-5" /> : <ArrowDown className="size-5" />}
      </span>
    </motion.li>
  )
}

export default function GrauzinhoGame(ctx: GameContext) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const { start, answer } = useMemo(() => dailyAngle(date), [date])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ guesses: [], construct: null }),
  })
  const [input, setInput] = useState('90')
  const [arc, setArc] = useState<ArcStyle>(() => readJSON('grauzinho:arc', 'suave'))
  const [sweep, setSweep] = useState(90)
  const [announce, setAnnounce] = useState('')

  const feedback = state.guesses.map((g) => evaluateGuess(g, answer, lang))
  const won = feedback.some((f) => f.direction === 'solved')
  const finished = status === 'won' || status === 'lost'

  const submit = () => {
    if (finished) return
    const value = Number(input)
    if (!Number.isInteger(value) || value < 0 || value > 360 || input === '') {
      setAnnounce(L('Digite um número de 0 a 360.', 'Type a number from 0 to 360.'))
      return
    }
    const fb = evaluateGuess(value, answer, lang)
    const guesses = [...state.guesses, value]
    setState({ ...state, guesses })
    setAnnounce(L(`Palpite ${guesses.length}: ${value} graus. ${fb.label}`, `Guess ${guesses.length}: ${value} degrees. ${fb.label}`))
    if (fb.direction === 'solved') finish(true, String(guesses.length))
    else if (guesses.length >= MAX_GUESSES) finish(false, 'X')
  }

  const constructAttempts = state.construct ?? []
  const constructResults = constructAttempts.map((p) => evaluateConstruct(p, answer, lang))
  const constructSolved = constructResults.some((r) => r.solved)
  const constructDone = constructSolved || constructAttempts.length >= CONSTRUCT_ATTEMPTS

  const share = shareText(
    game.shareName,
    number,
    feedback,
    won,
    state.construct && constructAttempts.length ? { attempts: constructAttempts.length, solved: constructSolved } : null,
  )

  const startConstruct = () => {
    setSweep(answer > 180 ? 90 : 270)
    if (state.construct === null) setState({ ...state, construct: [] })
  }
  const submitConstruct = () => {
    if (constructDone) return
    setState({ ...state, construct: [...constructAttempts, sweep] })
  }

  const inConstruct = finished && state.construct !== null
  const recreateLabel = L(`Recriar o ângulo do dia (${answer}°)`, `Recreate today's angle (${answer}°)`)
  const arcNames: Record<ArcStyle, string> = { suave: L('suave', 'soft'), tracejado: L('tracejado', 'dashed'), nenhum: L('sem arco', 'no arc') }

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['1', '2', '3', '4', 'X']}
      highlightBucket={won ? String(state.guesses.length) : 'X'}
      resultAction={!inConstruct && !constructDone ? { label: `📐 ${recreateLabel}`, onClick: startConstruct } : undefined}
      help={L(
        <>
          <p>Descubra quantos graus tem o ângulo entre as duas linhas em até <strong>{MAX_GUESSES} palpites</strong>. Só vale o número exato!</p>
          <p>O ângulo é medido no <strong>sentido anti-horário</strong>, da linha escura até a laranja, e pode passar de 180°. O arco ajuda a ver qual lado conta.</p>
          <p>A cada palpite, a seta diz se o ângulo é <strong>maior ↑</strong> ou <strong>menor ↓</strong>, e a temperatura diz o quão perto você chegou: de "Congelando! 🥶" a "Fervendo! 🔥".</p>
          <p>Ao terminar, você pode <strong>recriar o ângulo do dia</strong>: arraste a linha laranja até formar o mesmo ângulo. São {CONSTRUCT_ATTEMPTS} tentativas e vale errar até {CONSTRUCT_TOLERANCE}°.</p>
        </>,
        <>
          <p>Find out how many degrees the angle between the two lines measures in up to <strong>{MAX_GUESSES} guesses</strong>. Only the exact number counts!</p>
          <p>The angle is measured <strong>counterclockwise</strong>, from the dark line to the orange one, and it can go past 180°. The arc shows which side counts.</p>
          <p>After each guess, the arrow tells you if the angle is <strong>bigger ↑</strong> or <strong>smaller ↓</strong>, and the temperature shows how close you got: from "Freezing! 🥶" to "Boiling! 🔥".</p>
          <p>When you finish, you can <strong>recreate today's angle</strong>: drag the orange line until it makes the same angle. You get {CONSTRUCT_ATTEMPTS} tries and can be off by up to {CONSTRUCT_TOLERANCE}°.</p>
        </>,
      )}
      gameSettings={
        <fieldset>
          <legend className="mb-1 text-sm">{L('Desenho do arco', 'Arc style')}</legend>
          <div className="flex gap-2">
            {(['suave', 'tracejado', 'nenhum'] as ArcStyle[]).map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={arc === opt}
                onClick={() => {
                  setArc(opt)
                  writeJSON('grauzinho:arc', opt)
                }}
                className={`rounded-lg border-2 px-3 py-1 text-sm ${arc === opt ? 'border-brand bg-accent' : 'border-ink/15'}`}
              >
                {arcNames[opt]}
              </button>
            ))}
          </div>
        </fieldset>
      }
      result={
        <>
          <p className="text-center text-base">
            {L('O ângulo era', 'The angle was')} <strong className="font-heading text-xl">{answer}°</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {!inConstruct ? (
        <>
          <AngleDrawing start={start} sweep={answer} arc={arc} label={L('Ângulo do dia', "Today's angle")} />
          {!finished && (
            <div className="mt-4 space-y-3">
              <Stepper value={input} onChange={setInput} min={0} max={360} onEnter={submit} />
              <Button variant="pop" size="xl" className="mx-auto flex w-full max-w-xs" onClick={submit}>
                {L('Chutar!', 'Guess!')}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {L('Palpites', 'Guesses')}: {state.guesses.length}/{MAX_GUESSES}
              </p>
            </div>
          )}
          <ol className="mx-auto mt-4 w-full max-w-sm space-y-2">
            <AnimatePresence>
              {feedback.map((fb, i) => (
                <GuessRow key={i} fb={fb} />
              ))}
            </AnimatePresence>
          </ol>
          {finished && (
            <div className="mx-auto mt-6 w-full max-w-sm space-y-3 text-center">
              <p className="font-heading text-lg">
                {won ? L(`Acertou em ${state.guesses.length}! 🎯`, `Got it in ${state.guesses.length}! 🎯`) : L(`Era ${answer}°. Amanhã tem mais!`, `It was ${answer}°. More tomorrow!`)}
              </p>
              <Button variant="pop" size="xl" className="w-full" onClick={startConstruct}>
                📐 {state.construct !== null ? L('Ver o ângulo recriado', 'See your recreated angle') : recreateLabel}
              </Button>
              <ShareButton text={share} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-semibold">{L(`Recrie ${answer}°`, `Recreate ${answer}°`)}</h2>
            <p className="text-sm text-muted-foreground">
              {constructDone
                ? constructSolved
                  ? L('Recriou! 🎉', 'Recreated! 🎉')
                  : L('Não foi dessa vez.', 'Not this time.')
                : L(
                    `Tentativa ${constructAttempts.length + 1} de ${CONSTRUCT_ATTEMPTS} · arraste a linha laranja · vale errar até ${CONSTRUCT_TOLERANCE}°`,
                    `Try ${constructAttempts.length + 1} of ${CONSTRUCT_ATTEMPTS} · drag the orange line · you can be off by up to ${CONSTRUCT_TOLERANCE}°`,
                  )}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
            <div className="w-full max-w-[300px]">
              <AngleDrawing
                start={start}
                sweep={constructDone ? constructAttempts[constructAttempts.length - 1] : sweep}
                arc={arc}
                ghosts={constructAttempts}
                truth={constructDone ? answer : null}
                onDrag={constructDone ? undefined : setSweep}
                label={L('Seu ângulo: arraste a linha laranja', 'Your angle: drag the orange line')}
              />
            </div>
            <figure className="rounded-2xl bg-muted p-2 text-center">
              <AngleDrawing start={start} sweep={answer} arc={arc} label={L('Ângulo original do dia', "Today's original angle")} small />
              <figcaption className="text-xs text-muted-foreground">{L('Ângulo do dia', "Today's angle")}</figcaption>
            </figure>
          </div>
          {!constructDone && (
            <div className="mx-auto max-w-sm space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Button variant="pop-outline" size="icon-lg" aria-label={L('Fechar 1°', 'Close 1°')} onClick={() => setSweep((s) => Math.max(1, s - 1))}>
                  <Minus />
                </Button>
                <span className="text-sm text-muted-foreground">{L('ajuste fino', 'fine-tune')}</span>
                <Button variant="pop-outline" size="icon-lg" aria-label={L('Abrir 1°', 'Open 1°')} onClick={() => setSweep((s) => Math.min(359, s + 1))}>
                  <Plus />
                </Button>
              </div>
              <Button variant="pop" size="xl" className="w-full" onClick={submitConstruct}>
                {L('É esse!', "That's it!")}
              </Button>
            </div>
          )}
          <ol className="mx-auto w-full max-w-sm space-y-2">
            {constructResults.map((r, i) => (
              <li key={i} className={`rounded-xl border-2 px-4 py-2 text-center font-heading ${r.solved ? 'tile-hit' : 'border-ink/15 bg-card'}`}>
                {r.produced}° — {r.off === 0 ? L('exato!', 'exact!') : L(`errou por ${r.off}°`, `off by ${r.off}°`)} · {r.solved ? r.hint : `${r.hint} · ${r.label}`}
              </li>
            ))}
          </ol>
          {constructDone && <ShareButton text={share} />}
        </div>
      )}
    </GameShell>
  )
}
