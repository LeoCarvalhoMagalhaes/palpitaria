import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { songLabel, type Song } from '@/config/music'
import { fetchData, useData } from '@/core/data'
import { ClipPlayer, getPreview, unlockAudio } from '@/core/preview'
import { SNIPPETS_MS, formatSeconds } from '@/games/toca-ai/logic'

/**
 * Página interna: confere a base de músicas do Toca Aí e do Refrão Cruzado e mede o tempo real de cada trecho.
 * Cada resultado mostra a duração pedida e a medida (início do som até o fim do trecho).
 */
export default function AudioCheck() {
  const data = useData(() => fetchData<{ songs: Song[]; obtido_em: string }>('musicas/songs.json'))
  const [seed, setSeed] = useState(1)
  const [results, setResults] = useState<Record<string, string>>({})
  const player = useRef(new ClipPlayer())

  useEffect(() => {
    document.title = 'Verificar áudio · Palpitaria'
  }, [])

  const sample = useMemo(() => {
    if (data.status !== 'ready') return []
    const songs = data.data.songs.filter((s) => s.appleId)
    return Array.from({ length: 5 }, (_, i) => songs[(seed * 131 + i * 197) % songs.length])
  }, [data, seed])

  if (data.status === 'loading') return <LoadingScreen />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  const songs = data.data.songs
  const withPreview = songs.filter((s) => s.appleId).length

  const test = async (s: Song, ms: number) => {
    const key = `${s.id}:${ms}`
    unlockAudio()
    setResults((r) => ({ ...r, [key]: 'carregando…' }))
    try {
      let started = 0
      await player.current.play(s.appleId!, 0, ms, 70, () => {
        const measured = performance.now() - started
        setResults((r) => ({ ...r, [key]: `✓ ${Math.round(measured)} ms` }))
      })
      started = performance.now()
      setResults((r) => ({ ...r, [key]: 'tocando…' }))
      const info = await getPreview(s.appleId!)
      setResults((r) => ({ ...r, [`${s.id}:info`]: `${info.artistName} – ${info.trackName}` }))
    } catch (e) {
      setResults((r) => ({ ...r, [key]: `✗ ${(e as Error).message}` }))
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
      <p className="mb-4 text-sm text-muted-foreground">
        Base: {songs.length} músicas (dados de {data.data.obtido_em}), {withPreview} com prévia da Apple. Toque um trecho: o resultado mostra quanto
        tempo o som durou de verdade (deve bater com o pedido, com poucos milissegundos de diferença).
      </p>
      <ul className="space-y-3">
        {sample.map((s) => (
          <li key={s.id} className="rounded-xl border-2 border-ink/10 bg-card p-3 text-sm" data-testid="audio-check-song">
            <p className="mb-2">
              <strong>#{s.rank}</strong> {songLabel(s)} <span className="text-muted-foreground">· Apple {s.appleId}</span>
            </p>
            {results[`${s.id}:info`] && <p className="mb-2 text-xs text-muted-foreground">Prévia: {results[`${s.id}:info`]}</p>}
            <div className="flex flex-wrap gap-2">
              {SNIPPETS_MS.map((ms) => (
                <span key={ms} className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => void test(s, ms)} aria-label={`Tocar ${formatSeconds(ms)} de ${songLabel(s)}`}>
                    <Play aria-hidden /> {formatSeconds(ms)}
                  </Button>
                  <span className="text-xs tabular-nums" data-testid={`result-${ms}`}>
                    {results[`${s.id}:${ms}`]}
                  </span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
