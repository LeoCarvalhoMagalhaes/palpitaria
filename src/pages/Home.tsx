import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Flame, Settings2 } from 'lucide-react'
import { CATEGORY_LABELS, GAMES, gameDescription, stateSlug, type GameCategory } from '@/config/games'
import { puzzleNumber } from '@/core/daily'
import { useToday } from '@/core/hooks'
import { useL, useLang } from '@/core/settings'
import { readDayStatus, type GameStatus } from '@/core/storage'
import { globalStreak } from '@/core/stats'
import { Countdown } from '@/components/Countdown'
import { QuickToggles } from '@/components/QuickToggles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SettingsPanel } from '@/components/SettingsPanel'

const STATUS_LABEL: Record<GameStatus, { pt: string; en: string }> = {
  new: { pt: 'Jogar', en: 'Play' },
  playing: { pt: 'Em andamento', en: 'In progress' },
  won: { pt: 'Concluído ✓', en: 'Done ✓' },
  lost: { pt: 'Não foi dessa vez', en: 'Not this time' },
}

export default function Home() {
  const today = useToday()
  const lang = useLang()
  const L = useL()
  const [filter, setFilter] = useState<GameCategory | 'todos'>('todos')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    document.title = L('Palpitaria · joguinhos diários', 'Palpitaria · daily games')
  }, [L])

  const statuses = useMemo(
    () => Object.fromEntries(GAMES.map((g) => [g.slug, readDayStatus(stateSlug(g, lang), today)])) as Record<string, GameStatus>,
    [today, lang],
  )
  const done = Object.values(statuses).filter((s) => s === 'won' || s === 'lost').length
  const streak = globalStreak(today)
  const visible = GAMES.filter((g) => filter === 'todos' || g.category === filter)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2" aria-label={L('Palpitaria, página inicial', 'Palpitaria, home page')}>
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-heading text-xl font-bold text-primary-foreground sticker" aria-hidden>
            P
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight">Palpitaria</span>
        </Link>
        <div className="flex items-center">
          <QuickToggles />
          <Button variant="ghost" size="icon-lg" aria-label={L('Configurações', 'Settings')} onClick={() => setSettingsOpen(true)}>
            <Settings2 />
          </Button>
        </div>
      </header>

      <section className="mb-6 rounded-3xl bg-card p-5 sticker sm:p-7">
        <h1 className="font-heading text-3xl leading-tight font-bold sm:text-4xl">
          {L(
            <>
              Um palpite por dia <span className="text-brand">não faz mal</span> a ninguém.
            </>,
            <>
              A guess a day <span className="text-brand">never hurt</span> anyone.
            </>,
          )}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {L(
            '11 joguinhos rápidos que mudam todo dia à meia-noite. Jogue, compartilhe e volte amanhã.',
            '11 quick games that change every day at midnight. Play, share and come back tomorrow.',
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 font-heading font-semibold text-[#1e1b2e]">
            <Flame className="size-4" aria-hidden />
            {streak} {streak === 1 ? L('dia seguido', 'day in a row') : L('dias seguidos', 'days in a row')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-heading font-semibold">
            {L(`${done} de ${GAMES.length} feitos hoje`, `${done} of ${GAMES.length} done today`)}
          </span>
        </div>
        <div className="mt-3">
          <Countdown label={L('Novos desafios em', 'New challenges in')} />
        </div>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label={L('Filtrar jogos', 'Filter games')}>
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
            {cat === 'todos' ? L('Todos', 'All') : CATEGORY_LABELS[cat][lang]}
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
              <Link to={`/${game.slug}`} className="group flex h-full flex-col rounded-2xl bg-card p-4 sticker sticker-press hover:-translate-y-0.5">
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
                      #{puzzleNumber(game.launchDate, today)} · {CATEGORY_LABELS[game.category][lang]}
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm">{gameDescription(game, lang)}</p>
                <span
                  className={`mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 font-heading text-sm font-semibold ${
                    finished ? (status === 'won' ? 'tile-hit' : 'bg-muted') : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {STATUS_LABEL[status][lang]}
                </span>
              </Link>
            </motion.li>
          )
        })}
      </ul>

      <footer className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link to="/creditos" className="underline underline-offset-2 hover:text-foreground">
          {L('Créditos e licenças', 'Credits and licenses')}
        </Link>
        <span>{L('Feito com carinho no Brasil 🇧🇷', 'Made with love in Brazil 🇧🇷')}</span>
      </footer>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L('Configurações', 'Settings')}</DialogTitle>
            <DialogDescription>{L('Valem para todos os jogos.', 'These apply to every game.')}</DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>
    </div>
  )
}
