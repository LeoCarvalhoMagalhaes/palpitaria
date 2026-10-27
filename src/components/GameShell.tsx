import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, BarChart3, CalendarDays, CircleHelp, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatsPanel } from '@/components/StatsPanel'
import { Countdown } from '@/components/Countdown'
import { SettingsPanel } from '@/components/SettingsPanel'
import type { GameMeta } from '@/config/games'
import { addDays, formatDateLong, puzzleNumber } from '@/core/daily'
import { readDayStatus, readJSON, writeJSON, type GameStatus } from '@/core/storage'
import { celebrate } from '@/core/celebrate'

export interface GameContext {
  game: GameMeta
  today: string
  date: string
  number: number
  isArchive: boolean
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
  const { game, today, date, number, isArchive, status, help, result, children } = props
  const [open, setOpen] = useState<null | 'help' | 'stats' | 'settings' | 'archive' | 'result'>(null)
  const prevStatus = useRef(status)

  useEffect(() => {
    const seenKey = `${game.slug}:seen-help`
    // Só vira "visto" quando a pessoa fecha a janela (ver closeHelp), não ao abrir.
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-1 border-b-2 border-ink/10 bg-background/90 px-2 py-2 backdrop-blur">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label="Voltar para a página inicial">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
            style={{ background: game.color }}
            aria-hidden
          >
            {game.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-semibold">{game.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              #{number} · {formatDateLong(date)}
              {isArchive && ' · arquivo'}
            </p>
          </div>
        </div>
        <HeaderButton label="Como jogar" onClick={() => setOpen('help')}>
          <CircleHelp />
        </HeaderButton>
        {props.hasArchive !== false && (
          <HeaderButton label="Jogos anteriores" onClick={() => setOpen('archive')}>
            <CalendarDays />
          </HeaderButton>
        )}
        <HeaderButton label="Estatísticas" onClick={() => setOpen(finished ? 'result' : 'stats')}>
          <BarChart3 />
        </HeaderButton>
        <HeaderButton label="Configurações" onClick={() => setOpen('settings')}>
          <Settings2 />
        </HeaderButton>
      </header>

      {isArchive && (
        <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-center text-sm">
          Você está jogando um desafio antigo. Ele não conta para a sequência.{' '}
          <Link className="font-semibold underline" to={`/${game.slug}`}>
            Ir para o de hoje
          </Link>
        </p>
      )}

      <main className="flex flex-1 flex-col">{children}</main>

      <Dialog
        open={open === 'help'}
        onOpenChange={(o) => {
          if (!o) writeJSON(`${game.slug}:seen-help`, true)
          setOpen(o ? 'help' : null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como jogar {game.name}</DialogTitle>
            <DialogDescription>{game.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">{help}</div>
          <Button
            variant="pop"
            size="xl"
            onClick={() => {
              writeJSON(`${game.slug}:seen-help`, true)
              setOpen(null)
            }}
          >
            Bora jogar!
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'stats' || open === 'result'} onOpenChange={(o) => setOpen(o ? open : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === 'result'
                ? status === 'won'
                  ? 'Mandou bem! 🎉'
                  : 'Não foi dessa vez'
                : 'Estatísticas'}
            </DialogTitle>
            <DialogDescription>
              {game.name} #{number}
            </DialogDescription>
          </DialogHeader>
          {open === 'result' && <div className="space-y-3">{result}</div>}
          <StatsPanel
            slug={game.slug}
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
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>Valem para todos os jogos, exceto as marcadas como deste jogo.</DialogDescription>
          </DialogHeader>
          {props.gameSettings && (
            <section className="space-y-3 rounded-xl bg-muted p-3">
              <h3 className="text-sm font-semibold">Deste jogo</h3>
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
  today,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: GameMeta
  today: string
  current: string
}) {
  const navigate = useNavigate()
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
          <DialogTitle>Jogos anteriores</DialogTitle>
          <DialogDescription>Perdeu algum dia? Jogue aqui. Desafios antigos não contam para a sequência.</DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {days.map((d) => {
            const st = open ? readDayStatus(game.slug, d) : 'new'
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
                      {d === today ? 'hoje' : new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
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
