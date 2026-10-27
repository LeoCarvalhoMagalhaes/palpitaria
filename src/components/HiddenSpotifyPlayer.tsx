import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Music } from 'lucide-react'
import { SnippetPlayer } from '@/core/spotify'

export interface SnippetControls {
  play: (trackId: string, durationMs: number, onEnd?: () => void) => Promise<void>
  stop: (notify?: boolean) => void
}

/**
 * Embed do Spotify dentro da tela, coberto por um cartão para não revelar a música.
 * Use o ref para chamar play() a partir de um clique.
 */
export const HiddenSpotifyPlayer = forwardRef<SnippetControls, { label?: string }>(function HiddenSpotifyPlayer(
  { label = 'Player do Spotify' },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<SnippetPlayer | null>(null)

  useEffect(() => {
    const p = new SnippetPlayer(hostRef.current!)
    playerRef.current = p
    return () => {
      p.destroy()
      playerRef.current = null
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      play: (trackId, durationMs, onEnd) => {
        const p = playerRef.current
        return p ? p.play(trackId, durationMs, onEnd) : Promise.reject(new Error('Player ainda não montado'))
      },
      stop: (notify) => playerRef.current?.stop(notify),
    }),
    [],
  )

  return (
    <div className="relative h-20 w-full overflow-hidden rounded-xl" aria-hidden="true">
      <div ref={hostRef} className="h-20 w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-muted text-sm font-semibold text-muted-foreground">
        <Music className="size-4" /> {label}
      </div>
    </div>
  )
})
