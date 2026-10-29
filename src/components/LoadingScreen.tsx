import { useL } from '@/core/settings'

export function LoadingScreen({ label }: { label?: string }) {
  const L = useL()
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-3 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <p className="font-heading text-muted-foreground">{label ?? L('Carregando…', 'Loading…')}</p>
      </div>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const L = useL()
  return (
    <div className="mx-auto my-10 max-w-sm rounded-2xl border-2 border-destructive/40 bg-card p-5 text-center" role="alert">
      <p className="font-heading text-lg">{L('Ops! Algo deu errado.', 'Oops! Something went wrong.')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold text-brand underline">
          {L('Tentar de novo', 'Try again')}
        </button>
      )}
    </div>
  )
}
