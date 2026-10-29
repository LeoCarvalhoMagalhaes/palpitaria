import { formatCountdown } from '@/core/daily'
import { useCountdown } from '@/core/hooks'
import { useL } from '@/core/settings'

export function Countdown({ label }: { label?: string }) {
  const ms = useCountdown()
  const L = useL()
  return (
    <p className="text-center text-sm text-muted-foreground">
      {label ?? L('Próximo desafio em', 'Next challenge in')}{' '}
      <time className="font-heading text-base font-semibold text-foreground tabular-nums" aria-live="off">
        {formatCountdown(ms)}
      </time>
    </p>
  )
}
