import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Check, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { fetchData, useData } from '@/core/data'
import { readJSON, writeJSON } from '@/core/storage'
import { GROUP_COLOR, validatePuzzle, type Puzzle } from '@/games/junto/logic'

type Decision = 'aprovado' | 'rejeitado'

/**
 * Página interna de revisão do Juntô: cada quebra-cabeça rascunho precisa ser aprovado por uma pessoa.
 * As decisões ficam no navegador e podem ser exportadas como JSON para substituir public/data/junto/puzzles.json.
 */
export default function JuntoReview() {
  const data = useData(() => fetchData<{ puzzles: Puzzle[] }>('junto/puzzles.json'))
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => readJSON('junto:review', {}))
  useEffect(() => writeJSON('junto:review', decisions), [decisions])
  useEffect(() => {
    document.title = 'Revisão do Juntô · Palpitaria'
  }, [])

  if (data.status === 'loading') return <LoadingScreen />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  const puzzles = data.data.puzzles
  const approved = puzzles.filter((p) => (decisions[p.id] ?? p.status) === 'aprovado').length

  const exportJson = () => {
    const out = { ...data.data, puzzles: puzzles.map((p) => ({ ...p, status: decisions[p.id] ?? p.status })) }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'puzzles.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 font-heading text-2xl font-bold">Revisão do Juntô</h1>
        <Button variant="pop" onClick={exportJson}>
          <Download aria-hidden /> Exportar JSON
        </Button>
      </header>
      <p className="mb-4 text-sm text-muted-foreground">
        {approved} de {puzzles.length} aprovados. Aprove ou rejeite cada quebra-cabeça. Depois exporte o JSON e substitua{' '}
        <code>public/data/junto/puzzles.json</code>. Rejeitados não aparecem no jogo.
      </p>
      <ol className="space-y-4">
        {puzzles.map((p) => {
          const st = decisions[p.id] ?? p.status
          const errors = validatePuzzle(p)
          return (
            <li key={p.id} className="rounded-2xl bg-card p-4 sticker">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="font-heading">{p.id}</strong>
                <span className="text-xs font-semibold uppercase">{st}</span>
              </div>
              {errors.length > 0 && <p className="mb-2 text-sm text-destructive">Problemas: {errors.join('; ')}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {p.grupos.map((g) => (
                  <div key={g.nivel} className="rounded-xl px-3 py-2 text-white" style={{ background: GROUP_COLOR[g.nivel] }}>
                    <p className="font-semibold">{g.categoria}</p>
                    <p className="text-sm">{g.palavras.join(', ')}</p>
                  </div>
                ))}
              </div>
              {Object.keys(p.ambiguas).length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pegadinhas: {Object.entries(p.ambiguas).map(([w, c]) => `${w} (parece ${c.join(' / ')})`).join('; ')}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant={st === 'aprovado' ? 'pop' : 'outline'} onClick={() => setDecisions({ ...decisions, [p.id]: 'aprovado' })}>
                  <Check aria-hidden /> Aprovar
                </Button>
                <Button size="sm" variant={st === 'rejeitado' ? 'destructive' : 'outline'} onClick={() => setDecisions({ ...decisions, [p.id]: 'rejeitado' })}>
                  <X aria-hidden /> Rejeitar
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
