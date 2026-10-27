import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shareResult } from '@/core/share'

export function ShareButton({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <pre className="rounded-xl bg-muted p-3 text-center font-sans text-sm leading-snug whitespace-pre-wrap" aria-label="Prévia do compartilhamento">
        {text}
      </pre>
      <Button variant="pop" size="xl" className="w-full" onClick={() => void shareResult(text)}>
        <Share2 aria-hidden /> Compartilhar
      </Button>
    </div>
  )
}
