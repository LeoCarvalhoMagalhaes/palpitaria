import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, BarChart3, CalendarDays, CircleHelp, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatsPanel } from '@/components/StatsPanel'
import { Countdown } from '@/components/Countdown'
import { SettingsPanel } from '@/components/SettingsPanel'
import { QuickToggles } from '@/components/QuickToggles'
import { gameDescription, type GameMeta } from '@/config/games'
import { addDays, formatDateLong, puzzleNumber } from '@/core/daily'
import { useL, useLang } from '@/core/settings'
import { readDayStatus, readJSON, writeJSON, type GameStatus } from '@/core/storage'
import { celebrate } from '@/core/celebrate'

export interface GameContext {
  game: GameMeta
  today: string
  date: string
  number: number
  isArchive: boolean
  /** Chave do progresso salvo (separada por idioma nos jogos de palavras). */
  stateKey: string
}

interface GameShellProps extends GameContext {
  status: GameStatus
  help: ReactNode
  /** Faixas do gráfico de distribuição. Vazio esconde o gráfico. */
  buckets: string[]
  bucketLabel?: (bucket: string) => string
  highlightBucket?: string | null
  showAverage?: string
  /** Conteúdo do painel de resultado (resumo + botão de compartilhar). */
  result: ReactNode
  /** Configurações específicas do jogo, exibidas acima das gerais. */
  gameSettings?: ReactNode
  children: ReactNode
  /** Jogos sem arquivo (ex.: gerados por semente sem dados) podem esconder o botão. */
  hasArchive?: boolean
  /** Botão extra na janela de resultado: fecha a janela e executa (ex.: rodada bônus). */
  resultAction?: { label: string; onClick: () => void }
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-lg" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function GameShell(props: GameShellProps) {
  const { game, today, date, number, isArchive, status, help, result, children, stateKey } = props
  const L = useL()
  const lang = useLang()
  const [open, setOpen] = useState<null | 'help' | 'stats' | 'settings' | 'archive' | 'result'>(null)
  const prevStatus = useRef(status)

  useEffect(() => {
    const seenKey = `${game.slug}:seen-help`
    // Só vira "visto" quando a pessoa fecha a janela, não ao abrir.
    if (!readJSON(seenKey, false)) setOpen('help')
  }, [game.slug])

  useEffect(() => {
    const finished = status === 'won' || status === 'lost'
    const wasFinished = prevStatus.current === 'won' || prevStatus.current === 'lost'
    prevStatus.current = status
    if (finished && !wasFinished) {
      if (status === 'won') celebrate()
      const t = window.setTimeout(() => setOpen('result'), 1200)
      return () => window.clearTimeout(t)
    }
  }, [status])

  useEffect(() => {
    document.title = `${game.name} · Palpitaria`
  }, [game.name])

  const finished = status === 'won' || status === 'lost'
  const closeHelp = () => {
    writeJSON(`${game.slug}:seen-help`, true)
    setOpen(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-0.5 border-b-2 border-ink/10 bg-background/90 px-2 py-2 backdrop-blur">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label={L('Voltar para a página inicial', 'Back to the home page')}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden size-9 shrink-0 place-items-center rounded-xl text-lg sm:grid" style={{ background: game.color }} aria-hidden>
            {game.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-semibold">{game.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              #{number} · {formatDateLong(date, lang)}
              {isArchive && L(' · arquivo', ' · archive')}
            </p>
          </div>
        </div>
        <HeaderButton label={L('Como jogar', 'How to play')} onClick={() => setOpen('help')}>
          <CircleHelp />
        </HeaderButton>
        {props.hasArchive !== false && (
          <HeaderButton label={L('Jogos anteriores', 'Past games')} onClick={() => setOpen('archive')}>
            <CalendarDays />
          </HeaderButton>
        )}
        <HeaderButton label={L('Estatísticas', 'Statistics')} onClick={() => setOpen(finished ? 'result' : 'stats')}>
          <BarChart3 />
        </HeaderButton>
        <span className="hidden sm:contents">
          <QuickToggles />
        </span>
        <HeaderButton label={L('Configurações', 'Settings')} onClick={() => setOpen('settings')}>
          <Settings2 />
        </HeaderButton>
      </header>

      {isArchive && (
        <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-center text-sm">
          {L('Você está jogando um desafio antigo. Ele não conta para a sequência.', "You're playing a past challenge. It doesn't count toward your streak.")}{' '}
          <Link className="font-semibold underline" to={`/${game.slug}`}>
            {L('Ir para o de hoje', "Go to today's")}
          </Link>
        </p>
      )}

      <main className="flex flex-1 flex-col">{children}</main>

      <Dialog
        open={open === 'help'}
        onOpenChange={(o) => {
          if (!o) closeHelp()
          else setOpen('help')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {L('Como jogar', 'How to play')} {game.name}
            </DialogTitle>
            <DialogDescription>{gameDescription(game, lang)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">{help}</div>
          <Button variant="pop" size="xl" onClick={closeHelp}>
            {L('Bora jogar!', "Let's play!")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'stats' || open === 'result'} onOpenChange={(o) => setOpen(o ? open : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === 'result'
                ? status === 'won'
                  ? L('Mandou bem! 🎉', 'Nailed it! 🎉')
                  : L('Não foi dessa vez', 'Not this time')
                : L('Estatísticas', 'Statistics')}
            </DialogTitle>
            <DialogDescription>
              {game.name} #{number}
            </DialogDescription>
          </DialogHeader>
          {open === 'result' && <div className="space-y-3">{result}</div>}
          {open === 'result' && props.resultAction && (
            <Button
              variant="pop-outline"
              size="xl"
              onClick={() => {
                setOpen(null)
                props.resultAction!.onClick()
              }}
            >
              {props.resultAction.label}
            </Button>
          )}
          <StatsPanel
            slug={stateKey}
            today={today}
            buckets={props.buckets}
            bucketLabel={props.bucketLabel}
            highlight={open === 'result' && !isArchive ? props.highlightBucket : null}
            showAverage={props.showAverage}
          />
          <Countdown />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'settings'} onOpenChange={(o) => setOpen(o ? 'settings' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L('Configurações', 'Settings')}</DialogTitle>
            <DialogDescription>
              {L('Valem para todos os jogos, exceto as marcadas como deste jogo.', 'These apply to every game, except the ones marked for this game.')}
            </DialogDescription>
          </DialogHeader>
          {props.gameSettings && (
            <section className="space-y-3 rounded-xl bg-muted p-3">
              <h3 className="text-sm font-semibold">{L('Deste jogo', 'This game')}</h3>
              {props.gameSettings}
            </section>
          )}
          <SettingsPanel />
        </DialogContent>
      </Dialog>

      <ArchiveDialog
        open={open === 'archive'}
        onOpenChange={(o) => setOpen(o ? 'archive' : null)}
        game={game}
        stateKey={stateKey}
        today={today}
        current={date}
      />
    </div>
  )
}

const STATUS_ICON: Record<GameStatus, string> = { new: '·', playing: '▶', won: '✅', lost: '❌' }

function ArchiveDialog({
  open,
  onOpenChange,
  game,
  stateKey,
  today,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: GameMeta
  stateKey: string
  today: string
  current: string
}) {
  const navigate = useNavigate()
  const L = useL()
  const lang = useLang()
  const days: string[] = []
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i)
    if (puzzleNumber(game.launchDate, d) < 1) break
    days.push(d)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L('Jogos anteriores', 'Past games')}</DialogTitle>
          <DialogDescription>
            {L('Perdeu algum dia? Jogue aqui. Desafios antigos não contam para a sequência.', "Missed a day? Play it here. Past challenges don't count toward your streak.")}
          </DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {days.map((d) => {
            const st = open ? readDayStatus(stateKey, d) : 'new'
            const isCurrent = d === current
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(d === today ? `/${game.slug}` : `/${game.slug}?dia=${d}`)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                    isCurrent ? 'border-brand' : 'border-ink/15'
                  }`}
                >
                  <span>
                    <strong className="block font-heading">#{puzzleNumber(game.launchDate, d)}</strong>
                    <span className="text-xs text-muted-foreground">
                      {d === today
                        ? L('hoje', 'today')
                        : new Date(`${d}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </span>
                  <span aria-label={st}>{STATUS_ICON[st]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
