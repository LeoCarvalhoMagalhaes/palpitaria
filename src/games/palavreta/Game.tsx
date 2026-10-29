import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Link2, Sparkles } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { VirtualKeyboard } from '@/components/VirtualKeyboard'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { readJSON, writeJSON } from '@/core/storage'
import { useL, useLang, useSettings } from '@/core/settings'
import { SITE_URL } from '@/config/games'
import {
  MAX_GUESSES,
  WORD_LENGTH,
  dailyAnswer,
  decodeChallenge,
  encodeChallenge,
  fold,
  hardModeViolation,
  keyboardStates,
  scoreGuess,
  shareText,
  type LetterState,
} from './logic'

interface Words {
  answers: string[]
  valid: string[]
  display: Record<string, string>
}

interface State {
  guesses: string[]
  hard: boolean
  blind: boolean
}

export default function PalavretaGame(ctx: GameContext) {
  const L = useL()
  const lang = useLang()
  const { update } = useSettings()
  const [params] = useSearchParams()
  // Link de desafio criado em outro idioma: troca para o idioma da palavra.
  const challengeLang = params.get('lingua')
  useEffect(() => {
    if (params.get('desafio') && (challengeLang === 'en' || challengeLang === 'pt') && challengeLang !== lang) update({ lang: challengeLang })
  }, [params, challengeLang, lang, update])
  const file = lang === 'en' ? 'palavreta/words-en.json' : 'palavreta/words.json'
  const data = useData(() => fetchData<Words>(file), [file])
  if (data.status === 'loading') return <LoadingScreen label={L('Embaralhando letras…', 'Shuffling letters…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} words={data.data} />
}

const TILE: Record<LetterState, string> = { hit: 'tile-hit', near: 'tile-near', miss: 'tile-miss' }

function Play({ ctx, words }: { ctx: GameContext; words: Words }) {
  const { game, number } = ctx
  const L = useL()
  const lang = useLang()
  const [params] = useSearchParams()
  const custom = params.get('desafio')
  const customWord = custom ? decodeChallenge(custom) : null
  const answer = customWord ?? dailyAnswer(words.answers, number)
  const valid = useMemo(() => new Set(words.valid), [words.valid])
  const display = (w: string) => words.display?.[fold(w)] ?? w

  const prefs = readJSON('palavreta:prefs', { hard: false, blind: false })
  const daily = useDailyGame<State>({
    slug: customWord ? 'palavreta-desafio' : ctx.stateKey,
    version: 1,
    date: customWord ? custom! : ctx.date,
    isArchive: ctx.isArchive || !!customWord,
    init: () => ({ guesses: [], hard: prefs.hard, blind: prefs.blind }),
  })
  const { state, status, setState, finish } = daily
  const [current, setCurrent] = useState('')
  const [shakeRow, setShakeRow] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const finished = status === 'won' || status === 'lost'
  const scored = state.guesses.map((w) => ({ word: w, score: scoreGuess(w, answer) }))
  const won = scored.some((s) => s.score.every((x) => x === 'hit'))
  const hideColors = state.blind && !finished

  const reject = (msg: string) => {
    toast(msg)
    setShakeRow((n) => n + 1)
  }

  const onEnter = useCallback(() => {
    if (finished) return
    if (current.length < WORD_LENGTH) return reject(L('Faltam letras', 'Not enough letters'))
    if (!valid.has(current)) return reject(L('Não conheço essa palavra', 'Not in word list'))
    if (state.hard) {
      const err = hardModeViolation(current, scored, lang)
      if (err) return reject(err)
    }
    const guesses = [...state.guesses, current]
    setState({ ...state, guesses })
    setCurrent('')
    const isWin = fold(current) === fold(answer)
    if (isWin) finish(true, String(guesses.length))
    else if (guesses.length >= MAX_GUESSES) finish(false, 'X')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, finished, valid, state, scored, answer])

  const onKey = useCallback((k: string) => setCurrent((c) => (c.length < WORD_LENGTH && !finished ? c + k : c)), [finished])
  const onBackspace = useCallback(() => setCurrent((c) => c.slice(0, -1)), [])

  const setMode = (patch: Partial<Pick<State, 'hard' | 'blind'>>) => {
    if (state.guesses.length > 0) {
      toast(L('Os modos só podem mudar antes do primeiro palpite.', 'Modes can only change before your first guess.'))
      return
    }
    const next = { ...state, ...patch }
    writeJSON('palavreta:prefs', { hard: next.hard, blind: next.blind })
    setState(next)
  }

  const modeLabel = [state.hard && L('difícil', 'hard'), state.blind && L('às cegas', 'blind')].filter(Boolean).join(', ')
  const share = shareText(game.shareName, customWord ? L('(desafio)', '(challenge)') : `#${number}`, scored.map((s) => s.score), won, modeLabel)

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < scored.length) return { letters: scored[i].word, score: scored[i].score, done: true }
    if (i === scored.length && !finished) return { letters: current, score: null, done: false }
    return { letters: '', score: null, done: false }
  })

  return (
    <GameShell
      {...ctx}
      status={customWord ? 'playing' : status}
      buckets={['1', '2', '3', '4', '5', '6', 'X']}
      highlightBucket={won ? String(state.guesses.length) : 'X'}
      help={L(
        <>
          <p>Descubra a palavra secreta de <strong>5 letras</strong> em até <strong>6 palpites</strong>. Acentos e ç são preenchidos sozinhos.</p>
          <ul className="space-y-1">
            <li><span className="rounded px-1.5 tile-hit">verde</span> letra certa no lugar certo</li>
            <li><span className="rounded px-1.5 tile-near">amarelo</span> a letra existe, mas em outro lugar</li>
            <li><span className="rounded px-1.5 tile-miss">cinza</span> a letra não está na palavra</li>
          </ul>
          <p><strong>Modo difícil:</strong> letras descobertas precisam ser usadas nos próximos palpites. <strong>Às cegas:</strong> as cores só aparecem no fim.</p>
          <p>Quer desafiar alguém? Use <strong>Criar desafio</strong> e mande o link.</p>
          <p className="text-muted-foreground">Palavras válidas: dicionário VERO (LibreOffice), licença LGPLv3/MPL.</p>
        </>,
        <>
          <p>Guess the secret <strong>5-letter</strong> word in up to <strong>6 tries</strong>.</p>
          <ul className="space-y-1">
            <li><span className="rounded px-1.5 tile-hit">green</span> right letter in the right spot</li>
            <li><span className="rounded px-1.5 tile-near">yellow</span> the letter is in the word, but in another spot</li>
            <li><span className="rounded px-1.5 tile-miss">gray</span> the letter is not in the word</li>
          </ul>
          <p><strong>Hard mode:</strong> revealed letters must be used in later guesses. <strong>Blind:</strong> colors only show at the end.</p>
          <p>Want to challenge someone? Use <strong>Create a challenge</strong> and send the link.</p>
          <p className="text-muted-foreground">Valid words: dwyl English word list (Unlicense). Answers: our own picks.</p>
        </>,
      )}
      gameSettings={
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>{L('Modo difícil', 'Hard mode')}</span>
            <Switch checked={state.hard} onCheckedChange={(v) => setMode({ hard: v })} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>{L('Às cegas (cores só no fim)', 'Blind (colors only at the end)')}</span>
            <Switch checked={state.blind} onCheckedChange={(v) => setMode({ blind: v })} />
          </label>
          <p className="text-xs text-muted-foreground">{L('Só dá para mudar antes do primeiro palpite do dia.', "Can only be changed before the day's first guess.")}</p>
        </div>
      }
      result={
        <>
          <p className="text-center text-base">
            {L('A palavra era', 'The word was')} <strong className="font-heading text-xl uppercase">{display(answer)}</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      {customWord && (
        <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-center text-sm">
          {L(
            <>🎯 Você está jogando um <strong>desafio personalizado</strong>. Ele não conta nas estatísticas.</>,
            <>🎯 You're playing a <strong>custom challenge</strong>. It doesn't count toward your stats.</>,
          )}
        </p>
      )}
      {modeLabel && <p className="mb-2 text-center text-xs font-semibold text-muted-foreground uppercase">{L('Modo', 'Mode')} {modeLabel}</p>}

      <div className="mx-auto grid w-full max-w-[330px] gap-1.5" role="grid" aria-label={L('Palpites', 'Guesses')}>
        {rows.map((row, r) => (
          <motion.div
            key={r === scored.length ? `cur-${shakeRow}` : r}
            className="grid grid-cols-5 gap-1.5"
            role="row"
            animate={r === scored.length && shakeRow ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
            transition={{ duration: 0.35 }}
          >
            {Array.from({ length: WORD_LENGTH }, (_, c) => {
              const ch = row.letters[c] ?? ''
              const st = row.score?.[c]
              const cls = row.done && st && !hideColors ? TILE[st] : row.done ? 'bg-ink/80 text-background border-ink' : ch ? 'border-ink bg-card' : 'border-ink/15 bg-card'
              return (
                <motion.div
                  key={c}
                  role="gridcell"
                  aria-label={ch ? `${ch}${row.done && st && !hideColors ? `: ${st === 'hit' ? L('certa', 'correct') : st === 'near' ? L('em outro lugar', 'wrong spot') : L('não tem', 'not in word')}` : ''}` : L('vazia', 'empty')}
                  initial={false}
                  animate={row.done ? { rotateX: [90, 0] } : ch ? { scale: [1.08, 1] } : {}}
                  transition={{ delay: row.done ? c * 0.12 : 0, duration: 0.3 }}
                  className={`grid aspect-square place-items-center rounded-lg border-2 font-heading text-3xl font-bold uppercase ${cls}`}
                >
                  {ch}
                </motion.div>
              )
            })}
          </motion.div>
        ))}
      </div>

      {finished && (
        <p className="mt-4 text-center font-heading text-lg">
          {won
            ? L('Mandou bem! 🎉', 'Nice one! 🎉')
            : L(
                <>Era <strong className="uppercase">{display(answer)}</strong>. Amanhã tem mais!</>,
                <>It was <strong className="uppercase">{display(answer)}</strong>. More tomorrow!</>,
              )}
        </p>
      )}

      <div className="mt-auto pt-6">
        {!finished ? (
          <VirtualKeyboard
            onKey={onKey}
            onEnter={onEnter}
            onBackspace={onBackspace}
            states={hideColors ? {} : keyboardStates(scored)}
          />
        ) : (
          <div className="mx-auto max-w-sm">
            <ShareButton text={share} />
          </div>
        )}
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => setCreateOpen(true)}>
            <Sparkles aria-hidden /> {L('Criar desafio para um amigo', 'Create a challenge for a friend')}
          </Button>
        </div>
      </div>

      <CreateChallenge open={createOpen} onOpenChange={setCreateOpen} valid={valid} />
    </GameShell>
  )
}

function CreateChallenge({ open, onOpenChange, valid }: { open: boolean; onOpenChange: (o: boolean) => void; valid: Set<string> }) {
  const L = useL()
  const lang = useLang()
  const [word, setWord] = useState('')
  const key = fold(word.trim())
  const ok = key.length === WORD_LENGTH && valid.has(key)
  const link = ok ? `${SITE_URL}palavreta?desafio=${encodeChallenge(key)}&lingua=${lang}` : ''
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L('Criar desafio', 'Create a challenge')}</DialogTitle>
          <DialogDescription>
          {L('Escolha uma palavra de 5 letras. A gente gera um link sem mostrar a palavra.', "Pick a 5-letter word. We'll make a link that doesn't show the word.")}
        </DialogDescription>
        </DialogHeader>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value.slice(0, 8))}
          placeholder={L('ex.: praia', 'e.g. beach')}
          aria-label={L('Palavra do desafio', 'Challenge word')}
          className="h-12 rounded-xl border-2 border-ink bg-card px-4 font-heading text-xl uppercase outline-none focus:border-brand-2"
        />
        {word && !ok && <p className="text-sm text-destructive">{L('Precisa ser uma palavra válida de 5 letras.', 'It must be a valid 5-letter word.')}</p>}
        <Button
          variant="pop"
          size="xl"
          disabled={!ok}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              toast.success(L('Link copiado! Mande para quem você quiser desafiar.', 'Link copied! Send it to whoever you want to challenge.'))
            } catch {
              toast(link)
            }
          }}
        >
          <Link2 aria-hidden /> {L('Copiar link do desafio', 'Copy challenge link')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
