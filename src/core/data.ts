import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<unknown>>()

/** Busca um arquivo de public/data respeitando a base do site (ex.: /palpitaria/ no GitHub Pages). */
export function fetchData<T>(file: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${file}`
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Não foi possível carregar ${file} (${res.status})`)
      return res.json()
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p as Promise<T>
}

export type Loadable<T> = { status: 'loading' } | { status: 'error'; error: string; retry: () => void } | { status: 'ready'; data: T }

export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loader()
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((err: Error) => alive && setState({ status: 'error', error: err.message, retry: () => setAttempt((a) => a + 1) }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps])
  return state
}
