import { useEffect, useRef } from 'react'
import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { cn } from 'cn'
import { Slider } from '@/components/ui/slider'
import { setVolume } from '@/core/preview'
import { useL, useSettings } from '@/core/settings'

/** Volume dos jogos de música: muda na hora, inclusive o trecho que está tocando. */
export function VolumeControl({ className }: { className?: string }) {
  const L = useL()
  const { settings, update } = useSettings()
  const beforeMute = useRef(settings.volume || 70)
  const muted = settings.volume === 0
  useEffect(() => setVolume(settings.volume), [settings.volume])
  const Icon = muted ? VolumeX : settings.volume < 50 ? Volume1 : Volume2
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={muted ? L('Ativar o som', 'Unmute') : L('Silenciar', 'Mute')}
        onClick={() => {
          if (muted) update({ volume: beforeMute.current || 70 })
          else {
            beforeMute.current = settings.volume
            update({ volume: 0 })
          }
        }}
      >
        <Icon className="size-5" aria-hidden />
      </button>
      <Slider
        className="w-28"
        min={0}
        max={100}
        step={5}
        value={[settings.volume]}
        onValueChange={([v]) => update({ volume: v })}
        aria-label="Volume"
      />
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{settings.volume}%</span>
    </div>
  )
}
