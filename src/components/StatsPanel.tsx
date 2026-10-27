import { motion } from 'motion/react'
import { loadStats, visibleStreak } from '@/core/stats'

interface StatsPanelProps {
  slug: string
  today: string
  /** Faixas da distribuição na ordem de exibição (ex.: ["1","2",...,"X"]). */
  buckets: string[]
  bucketLabel?: (bucket: string) => string
  highlight?: string | null
  showAverage?: string
}

export function StatsPanel({ slug, today, buckets, bucketLabel, highlight, showAverage }: StatsPanelProps) {
  const stats = loadStats(slug)
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const max = Math.max(1, ...buckets.map((b) => stats.distribution[b] ?? 0))
  const items: [string, string | number][] = [
    ['Jogados', stats.played],
    ['% vitórias', winPct],
    ['Sequência', visibleStreak(stats, today)],
    ['Recorde', stats.maxStreak],
  ]
  if (showAverage) {
    items.push([showAverage, stats.played ? (stats.scoreSum / stats.played).toFixed(1) : '–'])
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-4 gap-2 text-center">
        {items.slice(0, 4).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted px-1 py-2">
            <dd className="font-heading text-2xl font-semibold tabular-nums">{value}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      {showAverage && (
        <p className="text-center text-sm text-muted-foreground">
          {showAverage}: <strong className="text-foreground">{items[4][1]}</strong>
        </p>
      )}
      {buckets.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Distribuição</h3>
          <ol className="space-y-1">
            {buckets.map((b) => {
              const count = stats.distribution[b] ?? 0
              return (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <span className="w-8 shrink-0 text-right tabular-nums">{bucketLabel ? bucketLabel(b) : b}</span>
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    className={`rounded-md px-2 py-0.5 text-right font-semibold tabular-nums ${
                      highlight === b ? 'bg-primary text-primary-foreground' : 'bg-miss text-white'
                    }`}
                  >
                    {count}
                  </motion.span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
