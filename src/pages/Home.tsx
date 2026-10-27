import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Flame, Settings2 } from 'lucide-react'
import { CATEGORY_LABELS, GAMES, type GameCategory } from '@/config/games'
import { puzzleNumber } from '@/core/daily'
import { useToday } from '@/core/hooks'
import { readDayStatus, type GameStatus } from '@/core/storage'
import { globalStreak } from '@/core/stats'
import { Countdown } from '@/components/Countdown'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SettingsPanel } from '@/components/SettingsPanel'

const STATUS_LABEL: Record<GameStatus, string> = {
  new: 'Jogar',
  playing: 'Em andamento',
  won: 'Concluído ✓',
  lost: 'Não foi dessa vez',
}

export default function Home() {
  const today = useToday()
  const [filter, setFilter] = useState<GameCategory | 'todos'>('todos')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    document.title = 'Palpitaria · joguinhos diários'
  }, [])

  const statuses = useMemo(
    () => Object.fromEntries(GAMES.map((g) => [g.slug, readDayStatus(g.slug, today)])) as Record<string, GameStatus>,
    [today],
  )
  const done = Object.values(statuses).filter((s) => s === 'won' || s === 'lost').length
  const streak = globalStreak(today)
  const visible = GAMES.filter((g) => filter === 'todos' || g.category === filter)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Palpitaria, página inicial">
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-heading text-xl font-bold text-primary-foreground sticker" aria-hidden>
            P
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight">Palpitaria</span>
        </Link>
        <Button variant="ghost" size="icon-lg" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
          <Settings2 />
        </Button>
      </header>

      <section className="mb-6 rounded-3xl bg-card p-5 sticker sm:p-7">
        <h1 className="font-heading text-3xl leading-tight font-bold sm:text-4xl">
          Um palpite por dia <span className="text-brand">não faz mal</span> a ninguém.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          11 joguinhos rápidos que mudam todo dia à meia-noite. Jogue, compartilhe e volte amanhã.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 font-heading font-semibold text-ink">
            <Flame className="size-4" aria-hidden />
            {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-heading font-semibold">
            {done} de {GAMES.length} feitos hoje
          </span>
        </div>
        <div className="mt-3">
          <Countdown label="Novos desafios em" />
        </div>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrar jogos">
        {(['todos', ...Object.keys(CATEGORY_LABELS)] as (GameCategory | 'todos')[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className={`rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors ${
              filter === cat ? 'border-ink bg-ink text-background' : 'border-ink/20 hover:border-ink/50'
            }`}
          >
            {cat === 'todos' ? 'Todos' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </nav>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((game, i) => {
          const status = statuses[game.slug]
          const finished = status === 'won' || status === 'lost'
          return (
            <motion.li
              key={game.slug}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.04, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <Link
                to={`/${game.slug}`}
                className="group flex h-full flex-col rounded-2xl bg-card p-4 sticker sticker-press hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl transition-transform group-hover:rotate-[-6deg]"
                    style={{ background: game.color }}
                    aria-hidden
                  >
                    {game.emoji}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-heading text-xl leading-tight font-semibold">{game.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      #{puzzleNumber(game.launchDate, today)} · {CATEGORY_LABELS[game.category]}
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm">{game.description}</p>
                <span
                  className={`mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 font-heading text-sm font-semibold ${
                    finished ? (status === 'won' ? 'tile-hit' : 'bg-muted') : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </Link>
            </motion.li>
          )
        })}
      </ul>

      <footer className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link to="/creditos" className="underline underline-offset-2 hover:text-foreground">
          Créditos e licenças
        </Link>
        <span>Feito com carinho no Brasil 🇧🇷</span>
      </footer>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>Valem para todos os jogos.</DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>
    </div>
  )
}
