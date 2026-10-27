import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import Fuse from 'fuse.js'
import { Button } from '@/components/ui/button'

export interface Option {
  id: string
  label: string
  /** Textos extras usados na busca (apelidos, artista etc.). */
  keys?: string[]
  hint?: string
}

interface AutocompleteProps {
  options: Option[]
  onSelect: (option: Option) => void
  /** Chamado quando o texto digitado não corresponde a nenhuma opção. */
  onInvalid?: (text: string, suggestion: Option | null) => void
  placeholder: string
  label: string
  disabled?: boolean
  submitLabel?: string
  excludeIds?: Set<string>
  extraAction?: ReactNode
  maxResults?: number
}

function fold(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Campo de busca com lista de sugestões acessível (padrão combobox do WAI-ARIA). */
export function Autocomplete({
  options,
  onSelect,
  onInvalid,
  placeholder,
  label,
  disabled,
  submitLabel = 'Chutar',
  excludeIds,
  extraAction,
  maxResults = 6,
}: AutocompleteProps) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const fuse = useMemo(
    () =>
      new Fuse(
        options.map((o) => ({ ...o, _search: [o.label, ...(o.keys ?? [])].map(fold) })),
        { keys: ['_search'], threshold: 0.32, ignoreLocation: true },
      ),
    [options],
  )

  const results = useMemo(() => {
    const q = fold(text.trim())
    if (!q) return []
    return fuse
      .search(q, { limit: maxResults * 2 })
      .map((r) => r.item as Option)
      .filter((o) => !excludeIds?.has(o.id))
      .slice(0, maxResults)
  }, [text, fuse, excludeIds, maxResults])

  const choose = (opt: Option) => {
    onSelect(opt)
    setText('')
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  const submit = () => {
    const q = fold(text.trim())
    if (!q) return
    const exact = options.find((o) => [o.label, ...(o.keys ?? [])].some((k) => fold(k) === q))
    if (exact) return choose(exact)
    if (open && results[active]) return choose(results[active])
    onInvalid?.(text, results[0] ?? null)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={`${listId}-input`} className="sr-only">
            {label}
          </label>
          <input
            id={`${listId}-input`}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={disabled}
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
              setActive(0)
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(true)
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            className="h-12 w-full rounded-xl border-2 border-ink bg-card px-4 text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus:border-brand-2 disabled:opacity-60"
          />
        </div>
        <Button variant="pop" size="xl" onClick={submit} disabled={disabled}>
          {submitLabel}
        </Button>
        {extraAction}
      </div>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border-2 border-ink bg-popover p-1 shadow-lg"
        >
          {results.map((opt, i) => (
            <li
              key={opt.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(opt)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? 'bg-accent' : ''}`}
            >
              <span className="font-semibold">{opt.label}</span>
              {opt.hint && <span className="ml-2 text-sm text-muted-foreground">{opt.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
