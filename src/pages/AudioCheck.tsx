import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { songLabel, type Song } from '@/config/music'
import { fetchData, useData } from '@/core/data'
import { SnippetPlayer, embedUrl, trackUrl } from '@/core/spotify'

/**
 * Página interna: confere a base de músicas do Toca Aí e do Refrão Cruzado (top 1.000 do Spotify).
 * Sorteia algumas faixas para tocar pelo player oculto e mostra o embed visível de cada uma.
 */
export default function AudioCheck() {
  const data = useData(() => fetchData<{ songs: Song[]; obtido_em: string }>('musicas/songs.json'))
  const [seed, setSeed] = useState(0)
  const [status, setStatus] = useState<Record<string, string>>({})
  const playerRef = useRef<SnippetPlayer | null>(null)

  useEffect(() => {
    document.title = 'Verificar áudio · Palpitaria'
    const p = new SnippetPlayer()
    playerRef.current = p
    return () => p.destroy()
  }, [])

  const sample = useMemo(() => {
    if (data.status !== 'ready') return []
    const songs = data.data.songs
    return Array.from({ length: 6 }, (_, i) => songs[Math.floor(Math.abs(Math.sin(seed * 97 + i * 13)) * songs.length)])
  }, [data, seed])

  if (data.status === 'loading') return <LoadingScreen />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  const songs = data.data.songs
  const cats = songs.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.cat ?? 'sem gênero']: (acc[s.cat ?? 'sem gênero'] ?? 0) + 1 }), {})

  const test = async (s: Song) => {
    setStatus((st) => ({ ...st, [s.id]: 'tocando 5 s…' }))
    try {
      await playerRef.current!.play(s.id, 0, 5000, () => setStatus((st) => ({ ...st, [s.id]: '✓ tocou' })))
    } catch (e) {
      setStatus((st) => ({ ...st, [s.id]: `✗ ${(e as Error).message}` }))
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 font-heading text-2xl font-bold">Verificar áudio</h1>
        <Button variant="pop" onClick={() => setSeed((n) => n + 1)}>
          <Shuffle aria-hidden /> Sortear outras
        </Button>
      </header>
      <p className="mb-2 text-sm text-muted-foreground">
        Base: {songs.length} músicas (dados de {data.data.obtido_em}). Categorias: {Object.entries(cats).map(([k, v]) => `${k} ${v}`).join(' · ')}.
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        "Testar trecho" usa o player oculto dos jogos. O embed abaixo de cada música é o player visível do Spotify.
      </p>
      <ul className="space-y-3">
        {sample.map((s) => (
          <li key={s.id} className="rounded-xl border-2 border-ink/10 bg-card p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>#{s.rank}</strong> {songLabel(s)} {s.genre && <span className="text-muted-foreground">· {s.genre}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span>{status[s.id]}</span>
                <Button size="sm" variant="outline" onClick={() => void test(s)}>
                  <Play aria-hidden /> Testar trecho
                </Button>
              </span>
            </div>
            <iframe title={`Spotify: ${songLabel(s)}`} className="h-20 w-full rounded-xl" loading="lazy" allow="encrypted-media" src={embedUrl(s.id)} />
            <a className="text-xs underline" href={trackUrl(s.id)} target="_blank" rel="noopener noreferrer">
              open.spotify.com/track/{s.id}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
