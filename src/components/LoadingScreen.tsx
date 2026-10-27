export function LoadingScreen({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-3 animate-bounce rounded-full bg-brand"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <p className="font-heading text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto my-10 max-w-sm rounded-2xl border-2 border-destructive/40 bg-card p-5 text-center" role="alert">
      <p className="font-heading text-lg">Ops! Algo deu errado.</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold text-brand underline">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
