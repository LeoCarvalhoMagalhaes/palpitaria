import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AUDIO_CATEGORIES } from '@/config/soundcloud-sources'
import { loadPlaylist, playSnippet, soundLabel, type LoadedPlaylist } from '@/core/soundcloud'

type Result = { status: 'carregando' } | { status: 'ok'; total: number; titled: number; sample: string[]; pl: LoadedPlaylist } | { status: 'erro'; message: string }

/**
 * Página interna: carrega cada playlist configurada pelo widget oficial do SoundCloud e mostra se ela
 * responde e quantas faixas trouxe com título. Use antes de publicar e sempre que trocar playlists.
 */
export default function AudioCheck() {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [running, setRunning] = useState(false)

  useEffect(() => {
    document.title = 'Verificar áudio · Palpitaria'
  }, [])

  const run = async () => {
    setRunning(true)
    for (const cat of AUDIO_CATEGORIES) {
      for (const p of cat.playlists) {
        setResults((r) => ({ ...r, [p.url]: { status: 'carregando' } }))
        try {
          const pl = await loadPlaylist(p.url)
          const titled = pl.sounds.filter((s) => s.title)
          setResults((r) => ({
            ...r,
            [p.url]: { status: 'ok', total: pl.sounds.length, titled: titled.length, sample: titled.slice(0, 5).map(soundLabel), pl },
          }))
        } catch (err) {
          setResults((r) => ({ ...r, [p.url]: { status: 'erro', message: (err as Error).message } }))
        }
      }
    }
    setRunning(false)
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
        <Button variant="pop" onClick={run} disabled={running}>
          {running ? 'Verificando…' : 'Verificar playlists'}
        </Button>
      </header>
      <p className="mb-4 text-sm text-muted-foreground">
        Carrega cada playlist do SoundCloud usada pelo Toca Aí e pelo Refrão Cruzado. Uma playlist precisa de pelo menos 5 faixas com título.
        Para trocar playlists, edite <code>src/config/soundcloud-sources.ts</code>.
      </p>
      {AUDIO_CATEGORIES.map((cat) => (
        <section key={cat.id} className="mb-6">
          <h2 className="mb-2 font-heading text-xl font-semibold">{cat.name}</h2>
          <ul className="space-y-2">
            {cat.playlists.map((p) => {
              const r = results[p.url]
              return (
                <li key={p.url} className="rounded-xl border-2 border-ink/10 bg-card p-3 text-sm">
                  <a href={p.url} target="_blank" rel="noreferrer" className="font-semibold break-all underline">
                    {p.url.replace('https://soundcloud.com/', '')}
                  </a>
                  <p className="text-muted-foreground">Curadoria: {p.curator}</p>
                  {!r && <p>—</p>}
                  {r?.status === 'carregando' && <p>Carregando…</p>}
                  {r?.status === 'erro' && <p className="font-semibold text-destructive">✗ {r.message}</p>}
                  {r?.status === 'ok' && (
                    <div>
                      <p className={r.titled >= 5 ? 'font-semibold text-hit' : 'font-semibold text-destructive'}>
                        {r.titled >= 5 ? '✓' : '✗'} {r.titled} de {r.total} faixas com título
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {r.sample.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => playSnippet(r.pl, 0, 0, 5000, 70)}>
                        <Play aria-hidden /> Testar 5 s da 1ª faixa
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
