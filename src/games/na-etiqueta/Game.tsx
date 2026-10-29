import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import { GameShell, type GameContext } from '@/components/GameShell'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBox, LoadingScreen } from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { fetchData, useData } from '@/core/data'
import { useDailyGame } from '@/core/hooks'
import { useL, useLang } from '@/core/settings'
import { CATEGORY_EN, MAX_GUESSES, dailyProduct, evaluatePrice, formatUSD, parsePrice, shareText, type Product } from './logic'

interface State {
  guesses: number[]
}

export default function NaEtiquetaGame(ctx: GameContext) {
  const L = useL()
  const data = useData(() => fetchData<{ products: Product[] }>('na-etiqueta/products.json'))
  if (data.status === 'loading') return <LoadingScreen label={L('Abrindo o carrinho…', 'Grabbing a cart…')} />
  if (data.status === 'error') return <ErrorBox message={data.error} onRetry={data.retry} />
  return <Play ctx={ctx} products={data.data.products} />
}

/** Foto do produto (Wikimedia Commons, sem preço visível); sem foto, o emoji da categoria. */
function ProductImage({ product, color }: { product: Product; color: string }) {
  const L = useL()
  const [failed, setFailed] = useState(false)
  if (!product.image || failed) {
    return (
      <div className="mx-auto grid size-28 place-items-center rounded-2xl text-6xl" style={{ background: `${color}22` }} aria-hidden>
        {product.emoji}
      </div>
    )
  }
  return (
    <figure>
      <span className="mx-auto block aspect-square w-full max-w-xs overflow-hidden rounded-2xl border-2 border-ink/10 bg-white p-2 sm:max-w-sm">
        <img src={product.image.src} alt={product.name} fetchPriority="high" className="size-full object-contain" onError={() => setFailed(true)} />
      </span>
      <figcaption className="mt-1 text-[11px] text-muted-foreground">
        <a className="underline" href={product.image.page} target="_blank" rel="noopener noreferrer">
          {L('Foto da embalagem: Open Food Facts', 'Package photo: Open Food Facts')}
          {product.image.license ? ` (${product.image.license.replace(', Open Food Facts', '')})` : ''}
        </a>
      </figcaption>
    </figure>
  )
}

function Play({ ctx, products }: { ctx: GameContext; products: Product[] }) {
  const { game, date, number } = ctx
  const L = useL()
  const lang = useLang()
  const usd = (v: number) => formatUSD(v, lang)
  const product = useMemo(() => dailyProduct(products, number), [products, number])
  const { state, status, setState, finish } = useDailyGame<State>({
    slug: ctx.stateKey,
    version: 1,
    date,
    isArchive: ctx.isArchive,
    init: () => ({ guesses: [] }),
  })
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(0)
  const [warning, setWarning] = useState('')

  const results = state.guesses.map((g) => evaluatePrice(g, product.price))
  const won = results.some((r) => r.closeness === 'win')
  const finished = status === 'won' || status === 'lost'

  const submit = () => {
    if (finished) return
    const value = parsePrice(input)
    if (value === null) {
      setWarning(L('Chute inválido ⚠ Digite um preço, como 12,99.', 'Invalid guess ⚠ Type a price, like 12.99.'))
      return
    }
    setWarning('')
    const r = evaluatePrice(value, product.price)
    const guesses = [...state.guesses, value]
    setState({ guesses })
    setInput('')
    if (r.closeness === 'win') finish(true, String(guesses.length))
    else {
      setShake((s) => s + 1)
      if (guesses.length >= MAX_GUESSES) finish(false, 'X')
    }
  }

  const share = shareText(game.shareName, number, results, won)

  return (
    <GameShell
      {...ctx}
      status={status}
      buckets={['1', '2', '3', '4', '5', '6', 'X']}
      highlightBucket={won ? String(state.guesses.length) : 'X'}
      help={L(
        <>
          <p>Adivinhe o preço do produto do dia em até <strong>{MAX_GUESSES} chutes</strong>.</p>
          <p>Se o chute ficar a até <strong>5%</strong> do preço, você ganha!</p>
          <ul className="space-y-1">
            <li><strong>⬆️</strong> o preço é maior · <strong>⬇️</strong> o preço é menor</li>
            <li><span className="rounded px-1 tile-near">amarelo</span> errou por até 25%</li>
            <li><span className="rounded px-1 tile-far">vermelho</span> errou por mais de 25%</li>
          </ul>
          <p className="text-muted-foreground">
            Preços em dólar de um atacado dos EUA (base compilada em 2022–2023). Base de preços de KermWasTaken, licença MIT. Fotos das embalagens: Open Food Facts (CC BY-SA), sem preço visível.
          </p>
        </>,
        <>
          <p>Guess the price of today's product in up to <strong>{MAX_GUESSES} guesses</strong>.</p>
          <p>If your guess is within <strong>5%</strong> of the price, you win!</p>
          <ul className="space-y-1">
            <li><strong>⬆️</strong> the price is higher · <strong>⬇️</strong> the price is lower</li>
            <li><span className="rounded px-1 tile-near">yellow</span> off by up to 25%</li>
            <li><span className="rounded px-1 tile-far">red</span> off by more than 25%</li>
          </ul>
          <p className="text-muted-foreground">
            US dollar prices from a US warehouse club (data compiled in 2022–2023). Price data by KermWasTaken, MIT license. Package photos: Open Food Facts (CC BY-SA), with no visible price.
          </p>
        </>,
      )}
      result={
        <>
          <p className="text-center text-base">
            {L('O preço era', 'The price was')} <strong className="font-heading text-xl">{usd(product.price)}</strong>
          </p>
          <ShareButton text={share} />
        </>
      }
    >
      <article className="mx-auto w-full max-w-md rounded-3xl bg-card p-5 text-center sticker">
        <ProductImage key={product.id} product={product} color={game.color} />
        <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {lang === 'en' ? (CATEGORY_EN[product.category] ?? product.category) : product.category}
        </p>
        <h2 className="mt-1 font-heading text-2xl leading-tight font-semibold">{product.name}</h2>
        {product.size && <p className="mt-1 text-muted-foreground">{product.size}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{L('Preço de referência de um atacado dos EUA, 2022–2023', 'Reference price from a US warehouse club, 2022–2023')}</p>
      </article>

      {!finished && (
        <form
          className="mx-auto mt-5 flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">{L('Seu chute em dólares', 'Your guess in dollars')}</span>
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-heading text-lg text-muted-foreground">{L('US$', '$')}</span>
            <motion.input
              key={shake}
              animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
              transition={{ duration: 0.4 }}
              inputMode="decimal"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={L('0,00', '0.00')}
              className={`h-14 w-full rounded-xl border-2 border-ink bg-card pr-4 font-heading text-2xl font-semibold tabular-nums outline-none focus:border-brand-2 ${lang === 'en' ? 'pl-9' : 'pl-16'}`}
            />
          </label>
          <Button type="submit" variant="pop" size="xl" className="h-14">
            {L('Chutar', 'Guess')}
          </Button>
        </form>
      )}
      <p className="mt-2 min-h-5 text-center text-sm font-semibold text-destructive" role="alert">
        {warning}
      </p>

      <ol className="mx-auto mt-2 w-full max-w-md space-y-2">
        {Array.from({ length: MAX_GUESSES }, (_, i) => {
          const r = results[i]
          if (!r) {
            return <li key={i} className="h-12 rounded-xl border-2 border-dashed border-ink/15" aria-hidden />
          }
          const cls = r.closeness === 'win' ? 'tile-hit' : r.closeness === 'near' ? 'tile-near' : 'tile-far'
          const label =
            r.arrow === 'check'
              ? L('acertou', 'correct')
              : `${r.arrow === 'up' ? L('o preço é maior', 'the price is higher') : L('o preço é menor', 'the price is lower')}, ${r.closeness === 'near' ? L('perto', 'close') : L('longe', 'far')}`
          return (
            <motion.li
              key={i}
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.35 }}
              className={`flex h-12 items-center justify-between rounded-xl border-2 px-4 font-heading text-xl ${cls}`}
              aria-label={`${usd(r.value)}: ${label}`}
            >
              <span className="tabular-nums">{usd(r.value)}</span>
              {r.arrow === 'check' ? <Check /> : r.arrow === 'up' ? <ArrowUp /> : <ArrowDown />}
            </motion.li>
          )
        })}
      </ol>

      {finished && (
        <div className="mx-auto mt-5 w-full max-w-md space-y-2 text-center">
          <p className="font-heading text-lg">
            {won ? L('Na etiqueta! 🏷️', 'Right on the tag! 🏷️') : L(`Era ${usd(product.price)}. Amanhã tem mais!`, `It was ${usd(product.price)}. More tomorrow!`)}
          </p>
          <ShareButton text={share} />
        </div>
      )}
    </GameShell>
  )
}
