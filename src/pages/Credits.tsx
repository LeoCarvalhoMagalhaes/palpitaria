import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DATA = [
  {
    game: 'Mundaréu e Mais ou Menos',
    items: [
      ['Natural Earth — Admin 0 Countries 1:50m', 'Domínio público', 'https://www.naturalearthdata.com/'],
    ],
  },
  {
    game: 'Na Etiqueta',
    items: [
      ['Base de produtos e preços do projeto outro jogo (games.json), Copyright (c) 2023 KermWasTaken', 'MIT', 'https://github.com/KermWasTaken'],
      ['Preços originalmente compilados com apoio do site Costco Food Database', 'Referência citada pelo outro jogo', 'https://costcofdb.com/'],
    ],
  },
  {
    game: 'Palavreta, Rastro e Letra por Letra',
    items: [
      ['Dicionário e tesauro VERO pt_BR (LibreOffice), por Raimundo Santos Moura e colaboradores', 'LGPLv3 / MPL', 'https://github.com/LibreOffice/dictionaries/tree/master/pt_BR'],
      ['Modelo LaBSE (proximidade de sentido do Rastro), versão ONNX Xenova/LaBSE', 'Apache-2.0', 'https://huggingface.co/sentence-transformers/LaBSE'],
      ['Vocabulário do Rastro: FrequencyWords pt_BR, de Hermit Dave (OpenSubtitles 2018). A lista derivada é distribuída sob a mesma licença', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords'],
    ],
  },
  {
    game: 'Holofote',
    items: [
      ['MusicBrainz — dados centrais de artistas', 'CC0', 'https://musicbrainz.org/doc/About/Data_License'],
      ['ListenBrainz — estatísticas de artistas mais ouvidos', 'CC0', 'https://listenbrainz.org/'],
    ],
  },
  {
    game: 'Mais ou Menos',
    items: [
      ['Wikimedia — visualizações de páginas da Wikipédia em português', 'CC0', 'https://wikimedia.org/api/rest_v1/'],
      ['Kworb — streams no Spotify', 'Dados públicos do Kworb', 'https://kworb.net/spotify/songs.html'],
      ['Wikidata — notas do Metacritic, altitude de montanhas e comprimento de rios', 'CC0', 'https://www.wikidata.org/'],
      ['outro jogo — preços (mesma base do Na Etiqueta)', 'MIT', 'https://github.com/KermWasTaken'],
      ['IBGE — estimativas da população dos municípios', 'Dados públicos', 'https://servicodados.ibge.gov.br/api/docs/agregados'],
    ],
  },
]

const LIBS = [
  ['React, React Router', 'MIT'],
  ['shadcn/ui (componentes), Radix UI', 'MIT'],
  ['Motion for React', 'MIT'],
  ['Tailwind CSS, tw-animate-css', 'MIT'],
  ['globe.gl / three.js', 'MIT'],
  ['d3-scale, d3-scale-chromatic', 'ISC'],
  ['Fuse.js', 'Apache-2.0'],
  ['canvas-confetti', 'ISC'],
  ['sonner, lucide-react', 'MIT / ISC'],
  ['Fontes Fredoka e Nunito', 'SIL OFL 1.1'],
]

export default function Credits() {
  useEffect(() => {
    document.title = 'Créditos · Palpitaria'
  }, [])
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold">Créditos e licenças</h1>
      </header>
      <p className="mb-6 text-muted-foreground">
        A Palpitaria reimplementa regras de jogos diários conhecidos com conteúdo próprio ou de fontes abertas. Os nomes, textos e visual são
        nossos. Abaixo, todas as fontes de dados e as atribuições exigidas.
      </p>
      {DATA.map((d) => (
        <section key={d.game} className="mb-5">
          <h2 className="mb-2 font-heading text-lg font-semibold">{d.game}</h2>
          <ul className="space-y-1 text-sm">
            {d.items.map(([name, license, url]) => (
              <li key={name}>
                <a className="underline" href={url} target="_blank" rel="noreferrer">
                  {name}
                </a>{' '}
                — <span className="text-muted-foreground">{license}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mb-5">
        <h2 className="mb-2 font-heading text-lg font-semibold">Toca Aí e Refrão Cruzado (áudio)</h2>
        <p className="text-sm">
          As músicas são as mais tocadas da história do Spotify, segundo o ranking público do{' '}
          <a className="underline" href="https://kworb.net/spotify/songs.html" target="_blank" rel="noreferrer">
            Kworb
          </a>
          . O áudio toca pelo{' '}
          <a className="underline" href="https://developer.spotify.com/documentation/embeds" target="_blank" rel="noreferrer">
            player oficial do Spotify
          </a>{' '}
          (prévia de 30 s sem login). Gênero e ano vêm do catálogo da Apple. Nada é baixado ou hospedado por nós; os direitos das músicas
          pertencem aos titulares. Projeto sem vínculo com Spotify, Kworb ou Apple.
        </p>
      </section>
      <section className="mb-5">
        <h2 className="mb-2 font-heading text-lg font-semibold">Conteúdo próprio</h2>
        <p className="text-sm">
          Os quebra-cabeças do Juntô, as palavras do Letra por Letra, as respostas do Palavreta e do Rastro e a tabela de integrantes do Holofote
          foram escritos para a Palpitaria.
        </p>
      </section>
      <section>
        <h2 className="mb-2 font-heading text-lg font-semibold">Bibliotecas</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {LIBS.map(([name, license]) => (
            <li key={name}>
              {name} — <span className="text-muted-foreground">{license}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
