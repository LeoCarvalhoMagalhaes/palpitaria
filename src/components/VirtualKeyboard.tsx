import { useEffect } from 'react'
import { CornerDownLeft, Delete } from 'lucide-react'

export type KeyState = 'hit' | 'near' | 'miss' | undefined

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

interface VirtualKeyboardProps {
  onKey: (key: string) => void
  onEnter: () => void
  onBackspace: () => void
  states?: Record<string, KeyState>
  disabled?: boolean
  /** Escuta o teclado físico também. */
  physical?: boolean
}

const STATE_CLASS: Record<string, string> = {
  hit: 'tile-hit',
  near: 'tile-near',
  miss: 'tile-miss opacity-80',
}

export function VirtualKeyboard({ onKey, onEnter, onBackspace, states = {}, disabled, physical = true }: VirtualKeyboardProps) {
  useEffect(() => {
    if (!physical || disabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [role="dialog"]')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onBackspace()
      } else {
        const k = e.key
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
        if (/^[a-z]$/.test(k)) onKey(k)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey, onEnter, onBackspace, physical, disabled])

  const keyClass =
    'flex h-13 min-w-0 flex-1 items-center justify-center rounded-lg border-b-4 border-ink/25 font-heading text-lg font-semibold uppercase select-none active:translate-y-0.5 active:border-b-2 disabled:opacity-50 sm:h-14'

  return (
    <div className="mx-auto w-full max-w-lg space-y-1.5" role="group" aria-label="Teclado">
      {ROWS.map((row, r) => (
        <div key={row} className="flex gap-1.5">
          {r === 2 && (
            <button type="button" disabled={disabled} onClick={onEnter} className={`${keyClass} flex-[1.6] bg-primary text-primary-foreground`} aria-label="Enviar">
              <CornerDownLeft className="size-5" />
            </button>
          )}
          {row.split('').map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onKey(k)}
              className={`${keyClass} ${states[k] ? STATE_CLASS[states[k]!] : 'bg-muted'}`}
            >
              {k}
            </button>
          ))}
          {r === 2 && (
            <button type="button" disabled={disabled} onClick={onBackspace} className={`${keyClass} flex-[1.6] bg-muted`} aria-label="Apagar">
              <Delete className="size-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
