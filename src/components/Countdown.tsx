import { formatCountdown } from '@/core/daily'
import { useCountdown } from '@/core/hooks'

export function Countdown({ label = 'Próximo desafio em' }: { label?: string }) {
  const ms = useCountdown()
  return (
    <p className="text-center text-sm text-muted-foreground">
      {label}{' '}
      <time className="font-heading text-base font-semibold text-foreground tabular-nums" aria-live="off">
        {formatCountdown(ms)}
      </time>
    </p>
  )
}
