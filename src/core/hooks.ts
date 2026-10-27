import { useCallback, useEffect, useRef, useState } from 'react'
import { localDateKey, msUntilNextDay } from './daily'
import { readDay, writeJSON, dayKey, type DayRecord, type GameStatus } from './storage'
import { markActivity, recordResult } from './stats'

/** Data local de hoje, atualizada sozinha quando passa da meia-noite ou a aba volta ao foco. */
export function useToday(): string {
  const [today, setToday] = useState(localDateKey)
  useEffect(() => {
    const check = () => setToday(localDateKey())
    const timer = window.setTimeout(check, msUntilNextDay() + 500)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [today])
  return today
}

export function useCountdown(): number {
  const [ms, setMs] = useState(msUntilNextDay)
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNextDay()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return ms
}

interface DailyGameOptions<S> {
  slug: string
  /** Aumente quando o formato do estado mudar: estados antigos são descartados. */
  version: number
  date: string
  isArchive: boolean
  init: () => S
}

export interface DailyGame<S> {
  state: S
  status: GameStatus
  setState: (updater: S | ((prev: S) => S)) => void
  /** Encerra o desafio. Só desafios do dia contam para as estatísticas. */
  finish: (won: boolean, bucket: string, score?: number) => void
}

/** Estado de um desafio diário salvo por jogo e por data. */
export function useDailyGame<S>({ slug, version, date, isArchive, init }: DailyGameOptions<S>): DailyGame<S> {
  const load = useCallback((): DayRecord<S> => {
    return readDay<S>(slug, date, version) ?? { v: version, status: 'new', state: init() }
    // init muda a cada render; a data e o jogo é que definem o registro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, date, version])

  const [record, setRecord] = useState<DayRecord<S>>(load)
  const loadedFor = useRef(`${slug}|${date}`)

  useEffect(() => {
    const id = `${slug}|${date}`
    if (loadedFor.current !== id) {
      loadedFor.current = id
      setRecord(load())
    }
  }, [slug, date, load])

  const persist = useCallback(
    (rec: DayRecord<S>) => {
      writeJSON(dayKey(slug, date), rec)
    },
    [slug, date],
  )

  const setState = useCallback(
    (updater: S | ((prev: S) => S)) => {
      setRecord((prev) => {
        const state = typeof updater === 'function' ? (updater as (p: S) => S)(prev.state) : updater
        const status: GameStatus = prev.status === 'new' ? 'playing' : prev.status
        const next = { ...prev, state, status }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const finish = useCallback(
    (won: boolean, bucket: string, score = 0) => {
      setRecord((prev) => {
        if (prev.status === 'won' || prev.status === 'lost') return prev
        const next: DayRecord<S> = { ...prev, status: won ? 'won' : 'lost' }
        persist(next)
        if (!isArchive) {
          recordResult(slug, date, won, bucket, score)
          markActivity(date)
        }
        return next
      })
    },
    [persist, isArchive, slug, date],
  )

  return { state: record.state, status: record.status, setState, finish }
}
