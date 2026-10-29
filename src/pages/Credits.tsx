import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickToggles } from '@/components/QuickToggles'
import { useL } from '@/core/settings'

/** [texto pt, texto en, licença, link] */
type Source = [string, string, string, string]

const DATA: { pt: string; en: string; items: Source[] }[] = [
  {
    pt: 'Mundaréu e Mais ou Menos',
    en: 'Mundaréu and Mais ou Menos',
    items: [['Natural Earth — Admin 0 Countries 1:50m', 'Natural Earth — Admin 0 Countries 1:50m', 'Domínio público / Public domain', 'https://www.naturalearthdata.com/']],
  },
  {
    pt: 'Na Etiqueta',
    en: 'Na Etiqueta',
    items: [
      [
        'Base de produtos e preços do projeto outro jogo (games.json), Copyright (c) 2023 KermWasTaken',
        'Product and price data from the outro jogo project (games.json), Copyright (c) 2023 KermWasTaken',
        'MIT',
        'https://github.com/KermWasTaken',
      ],
      ['Preços originalmente compilados com apoio do site Costco Food Database', 'Prices originally compiled with help from the Costco Food Database site', 'Referência citada pelo outro jogo / Reference cited by outro jogo', 'https://costcofdb.com/'],
      [
        'Fotos ilustrativas dos produtos: Wikimedia Commons, só arquivos com licença livre (CC0, domínio público, CC BY, CC BY-SA). Autor e licença na página de cada arquivo (link na foto)',
        "Illustrative product photos: Wikimedia Commons, freely licensed files only (CC0, public domain, CC BY, CC BY-SA). Author and license on each file's page (linked from the photo)",
        'CC0 / PD / CC BY / CC BY-SA',
        'https://commons.wikimedia.org/',
      ],
    ],
  },
  {
    pt: 'Palavreta, Rastro e Letra por Letra (português)',
    en: 'Palavreta, Rastro and Letra por Letra (Portuguese)',
    items: [
      ['Dicionário e tesauro VERO pt_BR (LibreOffice), por Raimundo Santos Moura e colaboradores', 'VERO pt_BR dictionary and thesaurus (LibreOffice), by Raimundo Santos Moura and contributors', 'LGPLv3 / MPL', 'https://github.com/LibreOffice/dictionaries/tree/master/pt_BR'],
      ['Vocabulário do Rastro: FrequencyWords pt_BR, de Hermit Dave (OpenSubtitles 2018). A lista derivada é distribuída sob a mesma licença', 'Rastro vocabulary: FrequencyWords pt_BR by Hermit Dave (OpenSubtitles 2018). The derived list is shared under the same license', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords'],
    ],
  },
  {
    pt: 'Palavreta, Rastro e Letra por Letra (inglês)',
    en: 'Palavreta, Rastro and Letra por Letra (English)',
    items: [
      ['Lista de palavras em inglês dwyl/english-words (palpites válidos e conferência de grafia)', 'dwyl/english-words list (valid guesses and spelling checks)', 'Unlicense', 'https://github.com/dwyl/english-words'],
      ['Vocabulário do Rastro e títulos em inglês: FrequencyWords en, de Hermit Dave (OpenSubtitles 2018)', 'Rastro vocabulary and English title detection: FrequencyWords en by Hermit Dave (OpenSubtitles 2018)', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords'],
    ],
  },
  {
    pt: 'Rastro',
    en: 'Rastro',
    items: [['Modelo LaBSE (proximidade de sentido), versão ONNX Xenova/LaBSE', 'LaBSE model (meaning closeness), ONNX version Xenova/LaBSE', 'Apache-2.0', 'https://huggingface.co/sentence-transformers/LaBSE']],
  },
  {
    pt: 'Holofote',
    en: 'Holofote',
    items: [
      ['MusicBrainz — dados centrais de artistas', 'MusicBrainz — core artist data', 'CC0', 'https://musicbrainz.org/doc/About/Data_License'],
      ['ListenBrainz — estatísticas de artistas mais ouvidos', 'ListenBrainz — most listened-to artist statistics', 'CC0', 'https://listenbrainz.org/'],
      ['Fotos dos artistas: Wikimedia Commons, via Wikidata (P18). Autor e licença na página de cada arquivo (link na foto)', "Artist photos: Wikimedia Commons, via Wikidata (P18). Author and license on each file's page (linked from the photo)", 'Licença de cada arquivo / Per-file license', 'https://commons.wikimedia.org/'],
    ],
  },
  {
    pt: 'Mais ou Menos',
    en: 'Mais ou Menos',
    items: [
      ['Wikimedia — visualizações de páginas da Wikipédia em português e em inglês', 'Wikimedia — page views of the Portuguese and English Wikipedias', 'CC0', 'https://wikimedia.org/api/rest_v1/'],
      ['Kworb — streams no Spotify', 'Kworb — Spotify streams', 'Dados públicos do Kworb / Public Kworb data', 'https://kworb.net/spotify/songs.html'],
      ['Wikidata — notas do Metacritic, altitude de montanhas, comprimento de rios e nomes', 'Wikidata — Metacritic scores, mountain heights, river lengths and names', 'CC0', 'https://www.wikidata.org/'],
      ['outro jogo — preços (mesma base do Na Etiqueta)', 'outro jogo — prices (same data as Na Etiqueta)', 'MIT', 'https://github.com/KermWasTaken'],
      ['IBGE — estimativas da população dos municípios', 'IBGE — Brazilian city population estimates', 'Dados públicos / Public data', 'https://servicodados.ibge.gov.br/api/docs/agregados'],
      ['Imagens das opções: Wikimedia Commons (licença na página de cada arquivo) e capas de álbum da Apple Music', "Option images: Wikimedia Commons (license on each file's page) and Apple Music album artwork", 'Licença de cada arquivo / Per-file license', 'https://commons.wikimedia.org/'],
    ],
  },
]

const LIBS = [
  ['React, React Router', 'MIT'],
  ['shadcn/ui, Radix UI', 'MIT'],
  ['Motion for React', 'MIT'],
  ['Tailwind CSS, tw-animate-css', 'MIT'],
  ['globe.gl / three.js', 'MIT'],
  ['d3-scale, d3-scale-chromatic', 'ISC'],
  ['Fuse.js', 'Apache-2.0'],
  ['canvas-confetti', 'ISC'],
  ['sonner, lucide-react', 'MIT / ISC'],
  ['Fredoka, Nunito', 'SIL OFL 1.1'],
]

export default function Credits() {
  const L = useL()
  useEffect(() => {
    document.title = `${L('Créditos', 'Credits')} · Palpitaria`
  }, [L])
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Button variant="ghost" size="icon-lg" asChild>
          <Link to="/" aria-label={L('Voltar', 'Back')}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 font-heading text-2xl font-bold">{L('Créditos e licenças', 'Credits and licenses')}</h1>
        <QuickToggles />
      </header>
      <p className="mb-6 text-muted-foreground">
        {L(
          'A Palpitaria reimplementa regras de jogos diários conhecidos com conteúdo próprio ou de fontes abertas. Os nomes, textos e visual são nossos. Abaixo, todas as fontes de dados e as atribuições exigidas.',
          'Palpitaria reimplements the rules of well-known daily games with original content or open sources. The names, texts and design are our own. Below are all data sources and required attributions.',
        )}
      </p>
      {DATA.map((d) => (
        <section key={d.pt} className="mb-5">
          <h2 className="mb-2 font-heading text-lg font-semibold">{L(d.pt, d.en)}</h2>
          <ul className="space-y-1 text-sm">
            {d.items.map(([pt, en, license, url]) => (
              <li key={pt}>
                <a className="underline" href={url} target="_blank" rel="noreferrer">
                  {L(pt, en)}
                </a>{' '}
                — <span className="text-muted-foreground">{license}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mb-5">
        <h2 className="mb-2 font-heading text-lg font-semibold">{L('Toca Aí, Holofote e Refrão Cruzado (áudio)', 'Toca Aí, Holofote and Refrão Cruzado (audio)')}</h2>
        <p className="text-sm">
          {L('As músicas são as mais tocadas da história do Spotify, segundo o ranking público do', 'The songs are the most streamed in Spotify history, according to the public ranking by')}{' '}
          <a className="underline" href="https://kworb.net/spotify/songs.html" target="_blank" rel="noreferrer">
            Kworb
          </a>
          .{' '}
          {L(
            'O áudio são as prévias oficiais de 30 s cedidas pela Apple Music (catálogo do iTunes), tocadas direto do servidor da Apple, como fazem os jogos de referência; cada resultado tem link para a faixa. Nada é baixado para o nosso servidor; os direitos das músicas pertencem aos titulares. Projeto sem vínculo com Spotify, Kworb ou Apple.',
            "The audio is Apple Music's official 30-second previews (iTunes catalog), played straight from Apple's servers, as the reference games do; every result links to the track. Nothing is downloaded to our server; song rights belong to their owners. Not affiliated with Spotify, Kworb or Apple.",
          )}
        </p>
      </section>
      <section className="mb-5">
        <h2 className="mb-2 font-heading text-lg font-semibold">{L('Conteúdo próprio', 'Original content')}</h2>
        <p className="text-sm">
          {L(
            'Os quebra-cabeças do Juntô, as palavras do Letra por Letra, as respostas do Palavreta e do Rastro, os temas e as pistas do Refrão Cruzado e a tabela de integrantes do Holofote foram escritos para a Palpitaria, em português e em inglês.',
            "Juntô's puzzles, Letra por Letra's words, the Palavreta and Rastro answers, Refrão Cruzado's themes and clues and Holofote's member table were written for Palpitaria, in Portuguese and English.",
          )}
        </p>
      </section>
      <section>
        <h2 className="mb-2 font-heading text-lg font-semibold">{L('Bibliotecas', 'Libraries')}</h2>
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
