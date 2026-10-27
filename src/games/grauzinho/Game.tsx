import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Minus, Plus, Target } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { Button } from '@/components/ui/button'
import { useDailyGame } from '@/core/hooks'
import { readJSON, writeJSON } from '@/core/storage'
import {
  CONSTRUCT_ATTEMPTS,
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
}: {
  start: number
  sweep: number
  arc: ArcStyle
  ghosts?: number[]
  truth?: number | null
}) {
  const a = point(start)
  const b = point(start + sweep)
  const arcR = 46
  const arcStart = point(start, arcR)
  const arcEnd = point(start + sweep, arcR)
  const largeArc = sweep > 180 ? 1 : 0
  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Ângulo do dia">
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
      {truth != null && (() => {
        const p = point(start + truth)
        return <line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--hit)" strokeWidth={6} strokeDasharray="8 6" strokeLinecap="round" />
      })()}
      <line x1={CENTER} y1={CENTER} x2={a.x} y2={a.y} stroke="var(--ink)" strokeWidth={8} strokeLinecap="round" />
      <line x1={CENTER} y1={CENTER} x2={b.x} y2={b.y} stroke="var(--brand)" strokeWidth={8} strokeLinecap="round" />
      <circle cx={CENTER} cy={CENTER} r={9} fill="var(--ink)" />
    </svg>
  )
}

/** Campo numérico com − e + que aceleram ao segurar. */
function Stepper({ value, onChange, min, max, disabled, onEnter }: {
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  disabled?: boolean
  onEnter: () => void
}) {
  const timer = useRef<number | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const step = (dir: 1 | -1) => {
    const current = Number(valueRef.current) || 0
    const next = Math.min(max, Math.max(min, current + dir))
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
      {btn(-1, 'Diminuir um grau', Minus)}
      <label className="relative">
        <span className="sr-only">Seu palpite em graus</span>
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
      {btn(1, 'Aumentar um grau', Plus)}
    </div>
  )
}

function GuessRow({ fb }: { fb: GuessFeedback }) {
  const solved = fb.direction === 'solved'
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between rounded-xl border-2 px-4 py-2 font-heading text-lg ${
        solved ? 'tile-hit' : 'border-ink/15 bg-card'
      }`}
    >
      <span className="tabular-nums">{fb.value}°</span>
      <span className="text-base">{fb.label}</span>
      <span aria-label={solved ? 'acertou' : fb.direction === 'up' ? 'o ângulo é maior' : 'o ângulo é menor'}>
        {solved ? <Target className="size-5" /> : fb.direction === 'up' ? <ArrowUp className="size-5" /> : <ArrowDown className="size-5" />}
      </span>
    </motion.li>
  )
}

export default function GrauzinhoGame(ctx: GameContext) {
  const { game, date, number } = ctx
  const { start, answer } = useMemo(() => dailyAngle(date), [date])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: game.slug,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ guesses: [], construct: null }),
  })
  const [input, setInput] = useState('90')
  const [arc, setArc] = useState<ArcStyle>(() => readJSON('grauzinho:arc', 'suave'))
  const [sweep, setSweep] = useState(90)
  const [announce, setAnnounce] = useState('')

  const feedback = state.guesses.map((g) => evaluateGuess(g, answer))
  const won = feedback.some((f) => f.direction === 'solved')
  const finished = status === 'won' || status === 'lost'

  const submit = () => {
    if (finished) return
    const value = Number(input)
    if (!Number.isInteger(value) || value < 0 || value > 360 || input === '') {
      setAnnounce('Digite um número de 0 a 360.')
      return
    }
    const fb = evaluateGuess(value, answer)
    const guesses = [...state.guesses, value]
    setState({ ...state, guesses })
    setAnnounce(`Palpite ${guesses.length}: ${value} graus. ${fb.label}`)
    if (fb.direction === 'solved') finish(true, String(guesses.length))
    else if (guesses.length >= MAX_GUESSES) finish(false, 'X')
  }

  const constructAttempts = state.construct ?? []
  const constructResults = constructAttempts.map((p) => evaluateConstruct(p, answer))
  const constructSolved = constructResults.some((r) => r.solved)
  const constructDone = constructSolved || constructAttempts.length >= CONSTRUCT_ATTEMPTS

  const share = shareText(
    game.shareName,
    number,
    feedback,
    won,
    state.construct && constructAttempts.length ? { attempts: constructAttempts.length, solved: constructSolved } : null,
  )

  const startConstruct = () => setState({ ...state, construct: [] })
  const submitConstruct = () => {
    if (constructDone) return
    setState({ ...state, construct: [...constructAttempts, sweep] })
  }

  const inConstruct = finished && state.construct !== null

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['1', '2', '3', '4', 'X']}
      highlightBucket={won ? String(state.guesses.length) : 'X'}
      help={
        <>
          <p>Descubra quantos graus tem o ângulo entre as duas linhas em até <strong>{MAX_GUESSES} palpites</strong>. Só vale o número exato!</p>
          <p>O ângulo é medido no <strong>sentido anti-horário</strong>, da linha escura até a laranja, e pode passar de 180°. O arco ajuda a ver qual lado conta.</p>
          <p>A cada palpite, a seta diz se o ângulo é <strong>maior ↑</strong> ou <strong>menor ↓</strong>, e a temperatura diz o quão perto você chegou: de "Congelando! 🥶" a "Fervendo! 🔥".</p>
          <p>Depois de terminar, tem uma <strong>rodada bônus</strong>: construa o ângulo do dia girando a linha. Vale errar até 5°.</p>
        </>
      }
      gameSettings={
        <fieldset>
          <legend className="mb-1 text-sm">Desenho do arco</legend>
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
                className={`rounded-lg border-2 px-3 py-1 text-sm capitalize ${arc === opt ? 'border-brand bg-accent' : 'border-ink/15'}`}
              >
                {opt === 'nenhum' ? 'sem arco' : opt}
              </button>
            ))}
          </div>
        </fieldset>
      }
      result={
        <>
          <p className="text-center text-base">
            O ângulo era <strong className="font-heading text-xl">{answer}°</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <p className="sr-only" aria-live="polite">{announce}</p>

      {!inConstruct ? (
        <>
          <AngleDrawing start={start} sweep={answer} arc={arc} />
          {!finished && (
            <div className="mt-4 space-y-3">
              <Stepper value={input} onChange={setInput} min={0} max={360} onEnter={submit} />
              <Button variant="pop" size="xl" className="mx-auto flex w-full max-w-xs" onClick={submit}>
                Chutar!
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Palpites: {state.guesses.length}/{MAX_GUESSES}
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
                {won ? `Acertou em ${state.guesses.length}! 🎯` : `Era ${answer}°. Amanhã tem mais!`}
              </p>
              <Button variant="pop-outline" size="xl" className="w-full" onClick={startConstruct}>
                Rodada bônus: construa {answer}°
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-semibold">Construa {answer}°</h2>
            <p className="text-sm text-muted-foreground">
              {constructDone
                ? constructSolved
                  ? 'Construiu! 🎉'
                  : 'Não foi dessa vez.'
                : `Tentativa ${constructAttempts.length + 1} de ${CONSTRUCT_ATTEMPTS} · vale errar até 5°`}
            </p>
          </div>
          <AngleDrawing
            start={start}
            sweep={constructDone ? constructAttempts[constructAttempts.length - 1] : sweep}
            arc={arc}
            ghosts={constructAttempts}
            truth={constructDone ? answer : null}
          />
          {!constructDone && (
            <div className="mx-auto max-w-sm space-y-3">
              <label className="block">
                <span className="sr-only">Girar a linha laranja</span>
                <input
                  type="range"
                  min={1}
                  max={359}
                  value={sweep}
                  onChange={(e) => setSweep(Number(e.target.value))}
                  className="w-full accent-[var(--brand)]"
                />
              </label>
              <p className="text-center text-xs text-muted-foreground">Arraste para girar. O número fica escondido 😉</p>
              <Button variant="pop" size="xl" className="w-full" onClick={submitConstruct}>
                É esse!
              </Button>
            </div>
          )}
          <ol className="mx-auto w-full max-w-sm space-y-2">
            {constructResults.map((r, i) => (
              <li key={i} className={`rounded-xl border-2 px-4 py-2 text-center font-heading ${r.solved ? 'tile-hit' : 'border-ink/15 bg-card'}`}>
                {r.solved ? `${r.produced}° — ${r.hint}` : `${r.produced}° — ${r.hint} · ${r.label}`}
              </li>
            ))}
          </ol>
          {constructDone && <ShareButton text={share} />}
        </div>
      )}
    </GameShell>
  )
}
