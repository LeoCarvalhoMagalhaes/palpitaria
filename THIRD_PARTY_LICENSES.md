# Licenças de terceiros

## Dados

### outro jogo — games.json (usado pelo Na Etiqueta)

```
MIT License

Copyright (c) 2023 KermWasTaken

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### VERO — dicionário e tesauro pt_BR do LibreOffice

Copyright (C) 2006–2013 Raimundo Santos Moura e colaboradores. Licença dupla LGPLv3 / MPL.
As listas derivadas em `public/data/palavreta`, `public/data/rastro` e `public/data/letra-por-letra` (validação) são redistribuídas sob a MPL.
Fonte: https://github.com/LibreOffice/dictionaries/tree/master/pt_BR

### FrequencyWords pt_BR (vocabulário do Rastro)

Copyright Hermit Dave. Conteúdo sob CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), derivado do OpenSubtitles 2018.
A lista `public/data/rastro/vocab.json` é uma adaptação (filtrada pelo dicionário VERO) e é distribuída sob a mesma licença CC BY-SA 4.0.
Fonte: https://github.com/hermitdave/FrequencyWords

### FrequencyWords en (vocabulário do Rastro em inglês)

Copyright Hermit Dave. CC BY-SA 4.0, derivado do OpenSubtitles 2018. `public/data/rastro-en/vocab.json` é uma adaptação (filtrada pela
lista dwyl) distribuída sob a mesma licença. Fonte: https://github.com/hermitdave/FrequencyWords

### dwyl/english-words

Unlicense (domínio público). Usada para validar palavras em inglês (Palavreta, Letra por Letra, Rastro). https://github.com/dwyl/english-words

### Imagens do Wikimedia Commons

Fotos dos artistas (Holofote), dos produtos (Na Etiqueta) e das opções (Mais ou Menos). Cada arquivo tem a própria licença (CC0, domínio
público, CC BY ou CC BY-SA); autor e licença ficam na página do arquivo, linkada em cada imagem. Não alteramos as imagens além da
miniatura padrão do Commons.

### Open Food Facts (fotos dos produtos)

Base de dados sob Open Database License (ODbL); fotos sob CC BY-SA 3.0, dos colaboradores do Open Food Facts.
Cada foto tem link para a página do produto. https://world.openfoodfacts.org/terms-of-use

### IMDb (notas dos filmes)

Information courtesy of IMDb (https://www.imdb.com). Used with permission. Conjunto `title.ratings.tsv.gz` dos IMDb Non-Commercial
Datasets, só para uso pessoal e não comercial. https://developer.imdb.com/non-commercial-datasets/

### Natural Earth

Domínio público. https://www.naturalearthdata.com/about/terms-of-use/

### MusicBrainz, ListenBrainz, Wikidata

CC0 1.0. https://musicbrainz.org/doc/About/Data_License · https://www.wikidata.org/wiki/Wikidata:Licensing

### IBGE

Dados públicos do Instituto Brasileiro de Geografia e Estatística. https://servicodados.ibge.gov.br/

### Modelo LaBSE (usado só no build dos dados do Rastro)

sentence-transformers/LaBSE e a conversão ONNX Xenova/LaBSE, Apache-2.0.

## Bibliotecas do site

| Pacote | Licença |
|---|---|
| react, react-dom, react-router | MIT |
| radix-ui, shadcn/ui (código dos componentes), cn | MIT |
| motion | MIT |
| tailwindcss, @tailwindcss/vite, tw-animate-css | MIT |
| globe.gl, three | MIT |
| d3-scale, d3-scale-chromatic | ISC |
| fuse.js | Apache-2.0 |
| canvas-confetti | ISC |
| sonner | MIT |
| lucide-react | ISC |
| class-variance-authority | Apache-2.0 |
| zod | MIT |
| @fontsource-variable/fredoka, @fontsource-variable/nunito | SIL OFL 1.1 (fontes) |

## Ferramentas de desenvolvimento

| Pacote | Licença |
|---|---|
| vite, vitest, typescript | MIT / Apache-2.0 |
| @playwright/test | Apache-2.0 |
| @axe-core/playwright, axe-core | MPL-2.0 |
| @turf/turf | MIT |
| @huggingface/transformers | Apache-2.0 |
| tsx, cross-env, oxlint | MIT |
