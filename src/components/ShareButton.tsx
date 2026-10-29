import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shareResult } from '@/core/share'
import { useL } from '@/core/settings'

export function ShareButton({ text }: { text: string }) {
  const L = useL()
  return (
    <div className="space-y-2">
      <pre className="rounded-xl bg-muted p-3 text-center font-sans text-sm leading-snug whitespace-pre-wrap" aria-label={L('Prévia do compartilhamento', 'Share preview')}>
        {text}
      </pre>
      <Button variant="pop" size="xl" className="w-full" onClick={() => void shareResult(text, L)}>
        <Share2 aria-hidden /> {L('Compartilhar', 'Share')}
      </Button>
    </div>
  )
}
